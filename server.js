require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const crypto = require("crypto");
const exec = require("child_process").exec;

const app = express();
const port = 3001;

// Middleware
app.use(helmet());
app.use(bodyParser.json()); // for parsing application/json

// Github Hook secret
const secret = process.env.WEBHOOK_SECRET;

// The webhook endpoint
app.post("/webhook", (req, res) => {
	// Verify the request signature
	const signature = `sha256=${crypto
		.createHmac("sha256", secret)
		.update(JSON.stringify(req.body))
		.digest("hex")}`;
	const githubSignature = req.headers["x-hub-signature-256"];

	if (signature !== githubSignature) {
		return res.status(401).send("Mismatched signatures");
	}

	const payload = req.body
	const ref = payload.ref

	// Only listen to changes in the prod branch
	if (ref === "refs/heads/prod") {
		console.log("{a}: push to prod detected")
		
		// Execute your deployment script
		exec("./deploy.sh", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return res.status(500).send("Deployment script failed");
			}
			console.log(`stdout: ${stdout}`);
			console.error(`stderr: ${stderr}`);
			res.status(200).send("Deployment initiated");
		});
	}
	else {
		console.log("{a}: push in other branch ", ref)
	}

	
});

app.listen(port, () => {
	console.log(`Deploy runner listening at http://localhost:${port}`);
});
