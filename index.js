(async()=>{
    "use strict";

    require("dotenv").config()
    
    // Dependencies
    const simpleAES256 = require("simple-aes-256")
    const { MongoClient } = require("mongodb")
    const request = require("request-async")
    const bottleNeck = require("bottleneck")
    const express = require("express")
    const moment = require("moment")
    const groom = require("groom")
    const _ = require("lodash")
    const hqc = require("hqc")
    
    // Variables
    var emot = {
        emails: [],
        masterKey: process.env.MASTER_KEY || "aW:FLAW{L{F:51290512wkOWQRJy5892wofqrji9`841ji",
        adminKey: process.env.ADMIN_KEY || "FAfafwaklfjaf905215151;[5;51515211-1-521"
    }
    
    const web = express()
    const port = process.env.PORT || 8080
    const threads = new bottleNeck.default({
        maxConcurrent: 20
    })

    const keyPair = await hqc.keyPair()

    const client = new MongoClient(process.env.MONGODB_URL)
    const database = client.db("core")
    const emails = database.collection("emot.emails")
    
    // Functions
    async function check(email){
        const emailIndex = _.findIndex(emot.emails, { email: email })
        var response = await request(`https://hnisa.vercel.app/api/breaches/email?email=${email}`)
        response = JSON.parse(response.body)

        if(response.status === "success"){
            const emailSources = _.find(emot.emails, { email: email }).breaches

            for( const source of response.data ) if(!emailSources.includes(source.name)) emot.emails[emailIndex].breaches.push(source.name)
        }

        email = emot.emails[emailIndex]

        await emails.updateOne({ email: email.encryptedEmail }, { $set: { breaches: simpleAES256.encrypt(emot.masterKey, JSON.stringify(email.breaches)).toString("hex") } })
    }

    function syncEmails(){
        return new Promise(async(resolve)=>{
            var list = await emails.find({}, { projection: { _id: 0 } }).toArray()

            for( const email in list ){
                list[email].encryptedEmail = list[email].email
                list[email].email = simpleAES256.decrypt(emot.masterKey, Buffer.from(list[email].email, "hex")).toString()
                list[email].breaches = JSON.parse(simpleAES256.decrypt(emot.masterKey, Buffer.from(list[email].breaches, "hex")).toString())
            }

            emot.emails = list
            resolve()
        })
    }

    async function checkEmails(){
        for( const email of emot.emails ) threads.schedule(check, email.email)
    }

    function getSecret(cyphertext){
        return new Promise(async(resolve)=>{
            resolve(await hqc.decrypt(Uint8Array.from(cyphertext.split(",").map(x=>parseInt(x,10))), keyPair.privateKey))
        })
    }
    
    /// Configurations
    // Express
    web.use(express.json())
    
    // Main
    console.log("Connecting to the database, please wait...")
    await client.connect()
    console.log("Successfully connected to the database.")
    
    web.get("/pk", (req, res)=>{
        res.json({
            data: keyPair.publicKey.toString()
        })
    })

    web.use((err, req, res, next)=>{
        if(err.message === "Bad request") return res.json({
            status: "failed",
            message: "Bad request."
        })
    
        next()
    })
    
    web.use("", async(req, res, next)=>{
        try{
            if(!req.body.hasOwnProperty("cyphertext") && !req.body.hasOwnProperty("data")) return res.json({
                status: "failed",
                message: "Invalid admin key."
            })

            const cyphertext = req.body.cyphertext
            const clientSecret = await getSecret(req.body.cyphertext)

            req.body = JSON.parse(simpleAES256.decrypt(clientSecret, Buffer.from(req.body.data, "hex")).toString())
            req.body.cyphertext = cyphertext

            if(!req.body.adminKey || req.body.adminKey !== emot.adminKey) return res.json({
                status: "failed",
                message: "Invalid admin key."
            })

            next()
        }catch{
            res.json({
                status: "failed",
                message: "Invalid admin key."
            })
        }
    })
    
    web.post("/list", async(req, res)=>{
        const clientSecret = await getSecret(req.body.cyphertext)
        const cleanList = []

        for( const email of emot.emails ) cleanList.push({ email: email.email, breaches: email.breaches, createdDate: email.createdDate })

        res.json({
            status: "success",
            data: simpleAES256.encrypt(clientSecret, JSON.stringify(cleanList)).toString("hex")
        })
    })
    
    web.post("/add", async(req, res)=>{
        const body = req.body
    
        if(!body.email || !body.email.match(/([\w\.\-_]+)?\w+@[\w-_]+(\.\w+){1,}/)) return res.json({
            status: "failed",
            message: "Invalid email."
        })
    
        const email = _.find(emot.emails, { email: body.email })
    
        if(email) return res.json({
            status: "failed",
            message: "The specified email already exists."
        })
    
        var data = { email: simpleAES256.encrypt(emot.masterKey, body.email).toString("hex"), breaches: simpleAES256.encrypt(emot.masterKey, JSON.stringify([])).toString("hex"), createdDate: moment().format("MMMM Do YYYY, h:mm:ss a") }
    
        await emails.insertOne(data)
        data.encryptedEmail = data.email
        data.email = body.email
        data.breaches = JSON.parse(simpleAES256.decrypt(emot.masterKey, Buffer.from(data.breaches, "hex")).toString())
        emot.emails.push(data)
    
        res.json({
            status: "success",
            data: true
        })
    })
    
    web.delete("/delete", async(req, res)=>{
        const body = req.body
    
        if(!body.email || !body.email.match(/([\w\.\-_]+)?\w+@[\w-_]+(\.\w+){1,}/)) return res.json({
            status: "failed",
            message: "Invalid email."
        })
    
        const email = _.find(emot.emails, { email: body.email })
    
        if(!email) return res.json({
            status: "failed",
            message: "The specified email does not exists."
        })
    
        await emails.deleteOne({ email: _.find(emot.emails, { email: body.email }).encryptedEmail })
        delete emot.emails[_.findIndex(emot.emails, { email: body.email })]
        emot.emails = groom(emot.emails)
    
        res.json({
            status: "success",
            data: true
        })
    })
    
    web.listen(port, async()=>{
        console.log(`Server is running. Port: ${port}`)

        await syncEmails()
        checkEmails()

        setInterval(async()=>{
            await syncEmails()
            checkEmails()
        }, 1800000) // Sync & Check for breaches every 30 minutes
    })
})()