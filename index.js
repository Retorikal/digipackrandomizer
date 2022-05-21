boostersContainerDOM = null;
boosterEntryDOMs = []
boosterEntryDOMTemplate = null;

cardPool = {}
infoCache = {}

window.onload = function () {
	document.getElementById("addbtn").addEventListener("click", addBooster);
	document.getElementById("rmbtn").addEventListener("click", removeBooster);
	document.getElementById("randombtn").addEventListener("click", randomize);
	document.getElementById("copybtn").addEventListener("click", copyOut);
	
	boosterEntryDOMTemplate = document.getElementById("boosterentry").cloneNode(true);
	boostersContainerDOM = document.getElementById("boosterslist");
	boosterEntryDOMs.push(document.getElementById("boosterentry"));

	fetchCards();
}

function copyOut(){
	navigator.clipboard.writeText(document.getElementById("output").innerText.replace(/\xA0/g, ' '));
	alert("Output saved to clipboard!");
}

function addBooster (){
	let clone = boosterEntryDOMTemplate.cloneNode(true);
	boostersContainerDOM.appendChild(clone);
	boosterEntryDOMs.push(clone);
}

function removeBooster (){
	let clone = boosterEntryDOMs.pop();
	clone.remove();
}

function randomize (){
	let output = openBoosters();
	if(!output) return;

	let cards = output.cards;
	let info = output.count;
	let padlen = output.longestName + 3;

	let infostring = `// You got ${info[0]} C, ${info[1]} U, ${info[2]} R, ${info[3]} SR, and ${info[5]} SEC\n`
	infostring += "// Please use digimoncard.dev to convert export formats if needed\n"
	for(cardid in cards){
		infostring += `${cards[cardid]} ${infoCache[cardid].n}`.padEnd(padlen, '\xa0') + `${cardid}\n`;
	}

	console.log(output);
	console.log(infostring);
	document.getElementById("output").innerText = infostring;
}

async function fetchCards () {
	response = await fetch("https://digimoncard.dev/data.php");
	cardlist = await response.json();

	// Sort cards to boosters and rarity pools
	for(idx in cardlist){
		let card = cardlist[idx];
		let id = card.cardid;
		let name = card.name;
		let pack = id.split("-")[0];
		let rarity = card.rare; // {0: C, 1: U, 2: R, 3: SR, 4: P, 5: SER}
		let type = card.cardtype; // {1: Tama, 2: Mon, 3: Tamer, 4: Option}

		if(!cardPool.hasOwnProperty(pack)){
			cardPool[pack] = {allcards:{}, opttamer:{}};
		}

		infoCache[id] = {r:rarity, n:name};

		// Distribute to random pool
		let opttamer = cardPool[pack].opttamer;
		let allcards = cardPool[pack].allcards;

		if (type >= 3){
			if(!opttamer.hasOwnProperty(rarity))
				opttamer[rarity] = new Set();

			opttamer[rarity].add(id);			
		}

		if(!allcards.hasOwnProperty(rarity))
			allcards[rarity] = new Set();

		allcards[rarity].add(id);
	}

	// Transform all set into list to support randomization
	for(pack in cardPool){
		for(r in cardPool[pack].allcards){
			cardPool[pack].allcards[r] = Array.from(cardPool[pack].allcards[r]);
		}

		for(r in cardPool[pack].opttamer){
			cardPool[pack].opttamer[r] = Array.from(cardPool[pack].opttamer[r]);
		}
	}

	document.getElementById("statmsg").innerText = "Fetch done! Hover on options to see details.";
	document.getElementById("randombtn").disabled = false;
}

function sample(array){
	return array[Math.floor(Math.random() * array.length)]
}

function openOneBooster(pack){
	let cards = [];
	let boosterPool = cardPool[pack];

	if(!boosterPool){
		alert(`You are trying to randomize from ${pack}. Check if that pack exists.`);
		return;
	}

	// Pool 4 Guaranteed common
	for(let i = 0; i<4 ; i++){
		cards.push(sample(boosterPool.allcards[0]))
	}
	// Pool 1 Guaranteed uncommon
	cards.push(sample(boosterPool.allcards[1]))

	// Get rare or higher card; chance is about 3/24 SR and 1/24 SER
	let diceroll = Math.floor(Math.random() * 24)
	let rarity = diceroll < 20 ? 2 : diceroll < 23 ? 3 : 5

	cards.push(sample(boosterPool.allcards[rarity]))
	return cards;
}

function openBoosters() {
	// Gather selected booster data and amount
	let boosterCount = {};

    boosterEntryDOMs.forEach(boosterEntryDOM => {
    	inputs = boosterEntryDOM.getElementsByTagName('input');
    	boosterData = {};

    	for (let boosterDataPoint of inputs) {
    		boosterData[boosterDataPoint.name] = boosterDataPoint.value;
    	}

    	boosterCount["BT" + boosterData['boosterid']] = boosterData['boosteramt'];
    })

	let acquiredCardList = {};
	let rarityCount = {0:0, 1:0, 2:0, 3:0, 5:0};
	let longestName = 0

    for(boosterID in boosterCount){
    	for(let i = 0; i < boosterCount[boosterID]; i++){
    		let cards = openOneBooster(boosterID);
    		if(!cards) return;

    		for (const card of cards) {
				acquiredCardList[card] = acquiredCardList[card] ? acquiredCardList[card] + 1 : 1;
				rarityCount[infoCache[card].r] += 1;
				longestName = Math.max(infoCache[card].n.length, longestName);
			}
    	}
    }

    return {cards:acquiredCardList, count:rarityCount, longestName: longestName};
}
