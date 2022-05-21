boostersContainerDOM = null;
boosterEntryDOMs = []
boosterEntryDOMTemplate = null;

cardDB = {};
infoCache = {};
cardPool = null;

window.onload = function () {
	document.getElementById("addbtn").addEventListener("click", addBooster);
	//document.getElementById("rmbtn").addEventListener("click", removeBooster);
	document.getElementById("randombtn").addEventListener("click", randomize);
	document.getElementById("copybtn").addEventListener("click", copyOut);
	document.getElementById("clearbtn").addEventListener("click", clearAll);
	
	boosterEntryDOMTemplate = document.getElementById("boosterentry").cloneNode(true);
	boostersContainerDOM = document.getElementById("boosterslist");
	boosterEntryDOMs.push(document.getElementById("boosterentry"));

	fetchCards();
}

function clearAll(){
	cardPool = null;
	document.getElementById("output").innerText = "// List reset!";
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

function removeBooster (e){
	let clone = e.parentElement.parentElement;
	let index = boosterEntryDOMs.indexOf(clone);
	boosterEntryDOMs.splice(index, 1);
	clone.remove();
}

function randomize (){
	output = openBoosters(cardPool);
	console.log(output);
	if(!output) return;

	cardPool = output;

	let cards = cardPool.cards;
	let count = cardPool.count;
	let newCount = cardPool.newCount;
	let newSet = cardPool.newCards
	let padlen = cardPool.longestName + 3;

	let infostring = `// You have ${count[0]} C, ${count[1]} U, ${count[2]} R, ${count[3]} SR, and ${count[5]} SEC\n`
	infostring += `// You got ${newCount[0]} C, ${newCount[1]} U, ${newCount[2]} R, ${newCount[3]} SR, and ${newCount[5]} SEC from last opening\n`
	infostring += "// Please use digimoncard.dev to convert export formats if needed\n\n"
	for(cardid in cards){
		let newNotif = newSet.has(cardid) ? " //NEW!" : "";
		infostring += `${cards[cardid]} ${infoCache[cardid].n}`.padEnd(padlen, '\xa0') + `${cardid}${newNotif}\n`;
	}
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

		if(!cardDB.hasOwnProperty(pack)){
			cardDB[pack] = {allcards:{}, opttamer:{}};
		}

		infoCache[id] = {r:rarity, n:name};

		// Distribute to random pool
		let opttamer = cardDB[pack].opttamer;
		let allcards = cardDB[pack].allcards;

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
	for(pack in cardDB){
		for(r in cardDB[pack].allcards){
			cardDB[pack].allcards[r] = Array.from(cardDB[pack].allcards[r]);
		}

		for(r in cardDB[pack].opttamer){
			cardDB[pack].opttamer[r] = Array.from(cardDB[pack].opttamer[r]);
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
	let boosterPool = cardDB[pack];

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

function openBoosters(previous = null) {
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

	let acquiredCardList = previous ? previous.cards : {};
	let rarityCount = previous ? previous.count : {0:0, 1:0, 2:0, 3:0, 5:0};
	let longestName = previous ? previous.longestName : 0;

	let newRarityCount = {0:0, 1:0, 2:0, 3:0, 5:0};
	let newCards = new Set();

    for(boosterID in boosterCount){
    	for(let i = 0; i < boosterCount[boosterID]; i++){
    		let cards = openOneBooster(boosterID);
    		if(!cards) return;

    		for (const card of cards) {
				acquiredCardList[card] = acquiredCardList[card] ? acquiredCardList[card] + 1 : 1;
				rarityCount[infoCache[card].r] += 1;
				newRarityCount[infoCache[card].r] += 1;
				longestName = Math.max(infoCache[card].n.length, longestName);
				newCards.add(card);
			}
    	}
    }

    return {
    	cards:acquiredCardList, 
    	count:rarityCount, 
    	newCount:newRarityCount,
    	newCards:newCards,
    	longestName: longestName
    };
}
