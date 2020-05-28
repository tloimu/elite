const fs = require("fs");
const util = require("util");
const process = require('process');

let userName = process.env.USERNAME;
let elite_logs_dir = `/Users/${userName}/Saved Games/Frontier Developments/Elite Dangerous`;

if (process.argv.length < 4)
{
	printHelp();
	process.exit(0);
}

function printHelp()
{
	console.log(`Usage: ${process.argv[0]} ${process.argv[1]} COMMANDER STARTING_SYSTEM`);
}

/*
{
  "timestamp": "2019-05-11T16:09:43Z",
  "event": "FSDJump",
  "StarSystem": "Brairoa WK-F d11-218",
  "SystemAddress": 7499927049699,
  "StarPos": [
    -4627.5625,
    -990.3125,
    31898.625
  ],
  "SystemAllegiance": "",
  "SystemEconomy": "$economy_None;",
  "SystemEconomy_Localised": "None",
  "SystemSecondEconomy": "$economy_None;",
  "SystemSecondEconomy_Localised": "None",
  "SystemGovernment": "$government_None;",
  "SystemGovernment_Localised": "None",
  "SystemSecurity": "$GAlAXY_MAP_INFO_state_anarchy;",
  "SystemSecurity_Localised": "Anarchy",
  "Population": 0,
  "Body": "Brairoa WK-F d11-218",
  "BodyID": 0,
  "BodyType": "Star",
  "JumpDist": 172.026,
  "FuelUsed": 4.679235,
  "FuelLevel": 17.823612,
  "BoostUsed": 4,
  "EDDMapColor": -65536,
  "EDD_EDSMFirstDiscover": true
}
*/

let commanderName = process.argv[2]
let fromSystemName = process.argv[3]
let toSystemName = process.argv[4]

console.log("From system:", fromSystemName);
console.log("To system:", toSystemName);
console.log("Commander:", commanderName);

let filesDone = 0;
let filesToDo = 0;

let lastFsdJumpStarPos = [];
let lastFsdJumpSystemName = "";
let lastFsdTime = "1970-01-01T00:00:00Z";

let currentFsdJumpStarPos = [];
let currentFsdJumpStarName = "";

let totalFsdJumps = 0;
let totalFsdJumpDistance = 0.0;
let totalScans = 0;
let foundFromSystem = false;
let foundToSystem = false;
let isTargetCommander = false;
let distanceFromStartSystem = 0.0;
let fromSystemPos = [];

function afterAllFiles()
{
	console.log(util.format("Last System Name [%s] pos %s", lastFsdJumpSystemName, lastFsdJumpStarPos));
	console.log("Jumps:", totalFsdJumps);
	console.log("Jump distance:", totalFsdJumpDistance);
	console.log("Scans:", totalScans);
	distanceFromStartSystem = Math.sqrt(
		Math.pow(currentFsdJumpStarPos[0] - fromSystemPos[0], 2) +
		Math.pow(currentFsdJumpStarPos[1] - fromSystemPos[1], 2) +
		Math.pow(currentFsdJumpStarPos[2] - fromSystemPos[2], 2));
	console.log("Distance:", distanceFromStartSystem);
}

function processLogLine(line)
{
	if (foundToSystem)
		return;
		
	try
	{
		let j = JSON.parse(line);
		if (isTargetCommander && j.event === "Scan")
		{
			if (foundFromSystem)
				totalScans = totalScans + 1;
		}
		else if (isTargetCommander && j.event === "FSDJump")
		{
			currentFsdJumpStarPos = j.StarPos;
			currentFsdJumpStarName = j.StarSystem;
			if (lastFsdTime < j.timestamp)
			{
				lastFsdTime = j.timestamp;
				lastFsdJumpStarPos = j.StarPos;
				lastFsdJumpSystemName = j.StarSystem;
			}
			
			if (foundFromSystem)
			{
				totalFsdJumps++;
				totalFsdJumpDistance = totalFsdJumpDistance + j.JumpDist;
				if (currentFsdJumpStarName === toSystemName)
				{
					foundToSystem = true;
					console.log("Found to system:", j);
				}
			}
			
			if (currentFsdJumpStarName === fromSystemName)
			{
				foundFromSystem = true;
				fromSystemPos = j.StarPos;
				console.log("Found starting system:", j);
			}
		} else if (j.event === "Commander")
		{
			if (j.Name === commanderName)
				isTargetCommander = true;
			else
				isTargetCommander = false;
		}
	}
	catch (e)
	{
		//console.log(e)
	}
}

function processFile(file)
{
	if (file.endsWith(".log"))
	{
		fs.readFile(elite_logs_dir+"/"+file, 'utf8', function(err, data)
		{
			if (err) throw err;
			let lines = data.split("\r");
			for (let i in lines)
			{
				let line = lines[i];
				processLogLine(line);
			}
			nextFile();
		});
	}
	else
		nextFile();
}

// Read all files in the directory and call <processFile> for each.
// Then call <afterAllFiles>.
let files = [];
fs.readdir(elite_logs_dir, function (err, filesInDirectory)
{
  if (err)
  {
    console.error("Could not list the directory.", err);
    process.exit(1);
  }

  filesToDo = filesInDirectory.length;
  files = filesInDirectory;
  files.sort();  
  nextFile();
});

function nextFile()
{
	if (filesDone === filesToDo || foundToSystem)
		afterAllFiles();
	else
	{
		let file = files[filesDone];
		filesDone = filesDone + 1;
		processFile(file);
	}
}
