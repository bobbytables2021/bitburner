// This file identifies, switches, preps, and then hwgw's servers
// in the background.

import { GetHosts, FindHost } from "./util.js";
import { CONSTANT } from "./constants.js";

/** @param {NS} ns **/
export async function main(ns) {
	var state = getState(ns);
	//ns.tprint("Get: " + JSON.stringify(state) + " " + Date.now());
	if (state.targetAvailable == undefined) {
		state.targetAvailable = 0;
	}
	const hosts = GetHosts(ns);
	var workers = setupWorkers(hosts);
	if (state.next == "") {
		state.next = findNext(ns, hosts, state.target);
		if (state.next != "") {
			ns.tprint("INFO: Switched next to " + state.next);
		}
	}
	if (state.next != "" && state.nextAvailable < Date.now()) {
		// We prep the next target first since we try fill the rest of the
		// network hacking the current target. If we don't do this, we could
		// get stuck at an non-optimal target.
		const time = prep(ns, FindHost(hosts, state.next), workers);
		if (time >= 0) {
			state.nextAvailable = time;
		} else {
			state.target = state.next;
			state.next = "";
			state.nextAvailable = 0;
			state.targetAvailable = 0;
			ns.tprint("INFO: Switched target to " + state.target);
		}
	}
	if (state.target != "" && state.targetAvailable < Date.now()) {
		state.targetAvailable = hwgw(ns, FindHost(hosts, state.target), workers);
	}
	//ns.tprint("Save: " + JSON.stringify(state));
	saveState(ns, state);
}

/** @param {NS} ns **/
function hwgw(ns, target, workers) {
	const securityDelta = target.hackDifficulty - target.minDifficulty;
	if (securityDelta > CONSTANT.securityEpsilon) {
		ns.tprint("ERROR: Security on " + target.hostname + " drifted to " + securityDelta);
		ns.tprint("INFO: Current: " + target.hackDifficulty + " Min: " + target.minDifficulty);
		return weaken(ns, target, securityDelta, workers);
	}
	const growFactor = target.moneyMax / target.moneyAvailable;
	if (growFactor > CONSTANT.growEpsilon) {
		ns.tprint("ERROR: Money on " + target.hostname + " drifted to " + growFactor);
		ns.tprint("INFO: Current: " + target.moneyAvailable + " Max: " + target.moneyMax);
		return grow(ns, target, growFactor, workers);
	}

	/// b**t = f
	/// log(b**t) = log(f)
	/// t log(b) = log(f)
	/// log(b) = log(f) / t
	/// b = exp(log(f) / t)
	//const growToE = ns.growthAnalyze(target.hostname, Math.E);
	//const growBase = Math.exp(1.0 / growToE);
	//ns.tprint("hP: " + hackPercent + " gB: " + growBase + " sG: " + target.serverGrowth);
	const hackPercent = ns.hackAnalyze(target.hostname);
	const maxGrow = ns.growthAnalyze(target.hostname, 1.0 / (1.0 - CONSTANT.hackLimit));
	const growsPerHack2 = ns.growthAnalyze(target.hostname, 1.0 / (1.0 - hackPercent));
	const numHackLimit = Math.floor(CONSTANT.hackLimit / hackPercent);
	const growsPerHack = 1.0 * maxGrow / numHackLimit;
	/// threads = x hack + gph x grow + x wph weaken + gph x wpg weaken + 3 roundup
	/// threads = (x + gph x + wph x + gph wpg x) + 3
	/// threads = (1 + gph + wph + gph wpg) x + 3
	/// x = (threads - 3) / (1 + gph + wph + gph wpg)
	const gph = growsPerHack;
	const wph = 1.0 / CONSTANT.hacksPerWeaken;
	const wpg = 1.0 / CONSTANT.growsPerWeaken;
	const hackFactor = 1.0 + gph + wph + gph * wpg;

	const hackTime = ns.getHackTime(target.hostname);
	const growTime = ns.getGrowTime(target.hostname);
	const weakenTime = ns.getWeakenTime(target.hostname);

	const hackDelay = weakenTime - hackTime - CONSTANT.hwgwSpacing;
	const weaken1Delay = 0;
	const growDelay = weakenTime - growTime + CONSTANT.hwgwSpacing;
	const weaken2Delay = 2 * CONSTANT.hwgwSpacing;

	for (var i = 0; i < workers.length; i++) {
		const worker = workers[i];
		const memory = worker.maxRam - worker.ramUsed - worker.reserve;
		const maxThreads = Math.floor(memory / CONSTANT.weakenSize);
		const maxHack = Math.floor((maxThreads - 3) / hackFactor);
		// We need to pass a unique dummy argument in case two sets of hwgw
		// are run on the same host.
		const uuid = Date.now();
		if (maxHack < 1) {
			const minGrow = Math.ceil(growsPerHack2);
			const minThreads = minGrow + 3;
			if (maxThreads >= minThreads) {
				if (ns.exec("hack.js", worker.hostname, 1, target.hostname, hackDelay, uuid)) {
					worker.ramUsed += CONSTANT.weakenSize * 1;
				} else {
					ns.tprint("ERROR: MinHack failed to run " + 1 + " hack threads on " + worker.hostname);
					const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
					ns.tprint("mG: " + minGrow + " t: " + (minGrow + 3) + " mT: " + maxThreads + " m: " + memory + " M: " + newmem);
				}
				if (ns.exec("weaken.js", worker.hostname, 1, target.hostname, weaken1Delay, uuid)) {
					worker.ramUsed += CONSTANT.weakenSize * 1;
				} else {
					ns.tprint("ERROR: MinHack failed to run " + 1 + " weaken1 threads on " + worker.hostname);
					const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
					ns.tprint("mG: " + minGrow + " t: " + (minGrow + 3) + " mT: " + maxThreads + " m: " + memory + " M: " + newmem);
				}
				if (ns.exec("grow.js", worker.hostname, minGrow, target.hostname, growDelay, uuid)) {
					worker.ramUsed += CONSTANT.weakenSize * minGrow;
				} else {
					ns.tprint("ERROR: MinHack failed to run " + minGrow + " grow threads on " + worker.hostname);
					const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
					ns.tprint("mG: " + minGrow + " t: " + (minGrow + 3) + " mT: " + maxThreads + " m: " + memory + " M: " + newmem);
				}
				if (ns.exec("weaken.js", worker.hostname, 1, target.hostname, weaken2Delay, uuid)) {
					worker.ramUsed += CONSTANT.weakenSize * 1;
				} else {
					ns.tprint("ERROR: MinHack failed to run " + 1 + " weaken2 threads on " + worker.hostname);
					const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
					ns.tprint("mG: " + minGrow + " t: " + (minGrow + 3) + " mT: " + maxThreads + " m: " + memory + " M: " + newmem);
				}
				return 0;
			}
			continue;
		}

		const numHack = Math.min(maxHack, numHackLimit);
		const numWeaken1 = Math.ceil(wph * numHack);
		const numGrow = Math.ceil(gph * numHack);
		const numWeaken2 = Math.ceil(gph * wpg * numHack);

		const totalThreads = numHack + numWeaken1 + numGrow + numWeaken2;
		if (totalThreads > maxThreads) {
			ns.tprint("ERROR: FullHack tried to run " + totalThreads + " on " + maxThreads + "max threads");
			return 0;
		}

		if (ns.exec("hack.js", worker.hostname, numHack, target.hostname, hackDelay, uuid)) {
			worker.ramUsed += CONSTANT.weakenSize * numHack;
		} else {
			ns.tprint("ERROR: FullHack failed to run " + numHack + " hack threads on " + worker.hostname);
			const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
			ns.tprint("tT: " + totalThreads + " mT: " + maxThreads + " M: " + newmem);
		}
		if (ns.exec("weaken.js", worker.hostname, numWeaken1, target.hostname, weaken1Delay, uuid)) {
			worker.ramUsed += CONSTANT.weakenSize * numWeaken1;
		} else {
			ns.tprint("ERROR: FullHack failed to run " + numWeaken1 + " weaken1 threads on " + worker.hostname);
			const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
			ns.tprint("tT: " + totalThreads + " mT: " + maxThreads + " M: " + newmem);
		}
		if (ns.exec("grow.js", worker.hostname, numGrow, target.hostname, growDelay, uuid)) {
			worker.ramUsed += CONSTANT.weakenSize * numGrow;
		} else {
			ns.tprint("ERROR: FullHack failed to run " + numGrow + " grow threads on " + worker.hostname);
			const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
			ns.tprint("tT: " + totalThreads + " mT: " + maxThreads + " M: " + newmem);
		}
		if (ns.exec("weaken.js", worker.hostname, numWeaken2, target.hostname, weaken2Delay, uuid)) {
			worker.ramUsed += CONSTANT.weakenSize * numWeaken2;
		} else {
			ns.tprint("ERROR: FullHack failed to run " + numWeaken2 + " weaken2threads on " + worker.hostname);
			const newmem = ns.getServerMaxRam(worker.hostname) - ns.getServerUsedRam(worker.hostname);
			ns.tprint("tT: " + totalThreads + " mT: " + maxThreads + " M: " + newmem);
		}
		return 0;
	}
	return 0;
}

/** @param {NS} ns **/
function prep(ns, target, workers) {
	const securityDelta = target.hackDifficulty - target.minDifficulty;
	ns.tprint("Host: " + target.hostname + " difficulty: " + target.hackDifficulty + " min: " + target.minDifficulty + " delta " + securityDelta);
	if (securityDelta > CONSTANT.securityEpsilon) {
		return weaken(ns, target, securityDelta, workers);
	}
	const growFactor = target.moneyMax / target.moneyAvailable;
	ns.tprint("Host: " + target.hostname + " growFactor: " + growFactor);
	if (growFactor > CONSTANT.growEpsilon) {
		return grow(ns, target, growFactor, workers);
	}
	ns.tprint("Prepped " + target.hostname + "!");
	return -1;
}

/** @param {NS} ns **/
function grow(ns, target, growFactor, workers) {
	const threads = Math.ceil(ns.growthAnalyze(target.hostname, growFactor));
	//ns.tprint("Running grow on " + target.hostname + " for factor of " + growFactor + " running " + threads + " threads");
	var threadsLeft = threads;
	for (var i = 0; i < workers.length; i++) {
		const worker = workers[i];
		const memory = worker.maxRam - worker.ramUsed - worker.reserve;
		if (memory < 2) {
			continue;
		}
		// weaken and grow scripts are the same size for now
		if (CONSTANT.growSize != CONSTANT.weakenSize) {
			ns.tprint("ERROR: " + CONSTANT.growSize + "(grow.js) != " + CONSTANT.weakenSize + "(weaken.js)");
			ns.exit();
		}
		const maxSets = Math.ceil(Math.floor(memory / CONSTANT.weakenSize) / (CONSTANT.growsPerWeaken + 1));
		if (maxSets < 1) {
			continue;
		}
		if (ns.exec("weaken.js", worker.hostname, maxSets, target.hostname, 0)) {
			worker.ramUsed += CONSTANT.weakenSize * maxSets;
		} else {
			ns.tprint("ERROR: grow failed to run " + maxSets + " weaken threads on " + worker.hostname);
			continue;
		}
		const memGrow = worker.maxRam - worker.ramUsed - worker.reserve;
		const maxThreads = Math.floor(memGrow / CONSTANT.growSize);
		const growThreads = Math.min(maxSets * CONSTANT.growsPerWeaken, threadsLeft, maxThreads);
		if (isNaN(growThreads) || growThreads < 1 || !growThreads) {
			ns.tprint("ERROR: growThreads: " + growThreads + " mS: " + maxSets + " tL: " + threadsLeft + " mT: " + maxThreads);
			continue;
		}
		if (ns.exec("grow.js", worker.hostname, growThreads, target.hostname, 0)) {
			threadsLeft -= growThreads;
			worker.ramUsed += CONSTANT.growSize * growThreads;
		} else {
			ns.tprint("ERROR: grow failed to run " + growThreads + " grow threads on " + worker.hostname);
		}
		if (threadsLeft == 0) {
			break;
		}
	}
	const threadsRun = threads - threadsLeft;
	if (threadsRun > 0) {
		const weakenTime = ns.getWeakenTime(target.hostname);
		const available = Date.now() + weakenTime;
		const mins = Math.floor(Math.ceil(weakenTime / 1000) / 60);
		const secs = Math.ceil(weakenTime / 1000) % 60;
		//ns.tprint("Running " + threadsRun + " threads for " + mins + "m" + secs + "s");
		return available;
	}
	return 0;
}

/** @param {NS} ns **/
function weaken(ns, target, securityDelta, workers) {
	const threads = Math.ceil(securityDelta / CONSTANT.weakenEffect);
	//ns.tprint("Running weaken on " + target.hostname + " for delta of " + securityDelta + " running " + threads + " threads");
	var threadsLeft = threads;
	for (var i = workers.length - 1; i >= 0; i--) {
		const worker = workers[i];
		const memory = worker.maxRam - worker.ramUsed - worker.reserve;
		if (memory < 2) {
			continue;
		}
		const maxThreads = Math.floor(memory / CONSTANT.weakenSize);
		if (maxThreads < 1) {
			continue;
		}
		if (threadsLeft > maxThreads) {
			if (ns.exec("weaken.js", worker.hostname, maxThreads, target.hostname, 0)) {
				threadsLeft -= maxThreads;
				worker.ramUsed += CONSTANT.weakenSize * maxThreads;
			} else {
				ns.tprint("ERROR: weaken failed to run " + maxThreads + " weaken threads on " + worker.hostname);
			}
		} else {
			if (ns.exec("weaken.js", worker.hostname, threadsLeft, target.hostname, 0)) {
				threadsLeft = 0;
				worker.ramUsed += CONSTANT.weakenSize * threadsLeft;
			} else {
				ns.tprint("ERROR: weaken failed to run " + threadsLeft + " weaken threads on " + worker.hostname);
			}
			threadsLeft = 0;
			break;
		}
	}
	const threadsRun = threads - threadsLeft;
	if (threadsRun > 0) {
		const weakenTime = ns.getWeakenTime(target.hostname);
		const available = Date.now() + weakenTime;
		const mins = Math.floor(Math.ceil(weakenTime / 1000) / 60);
		const secs = Math.ceil(weakenTime / 1000) % 60;
		//ns.tprint("Running " + threadsRun + " threads for " + mins + "m" + secs + "s");
		return available;
	}
	return 0;
}

/** @param {NS} ns **/
function findNext(ns, hosts, currentName) {
	const current = FindHost(hosts, currentName);
	const minScore = current ? 2 * current.moneyMax / ns.getWeakenTime(currentName) : 0;
	var max = 0;
	var maxName = "";
	for (const host of hosts) {
		const score = host.moneyMax / ns.getWeakenTime(host.hostname);
		if (host.hasAdminRights && score > minScore) {
			max = host.moneyMax;
			maxName = host.hostname;
		}
	}
	return maxName;
}

/** @param {NS} ns **/
function setupWorkers(hosts) {
	var workers = hosts.filter(function (host) {
		if (host.hostname == "n00dles" || host.hostname == "foodnstuff") {
			// These are reserved for our daemons.
			return false;
		}
		const memory = host.maxRam - host.ramUsed - host.reserve;
		return host.hasAdminRights && memory > 2;
	});
	workers.sort(function (l, r) {
		const lmem = l.maxRam - l.ramUsed;
		const rmem = r.maxRam - r.ramUsed;
		return rmem - lmem;
	});
	return workers;
}

/** @param {NS} ns **/
function getState(ns) {
	const content = ns.read("/tmp/hacker-state.txt");
	if (content.length > 0) {
		return JSON.parse(content);
	}
	return {
		target: "",
		// Start with n00dles to get a quick income.
		next: "n00dles",
		targetAvailable: 0,
		nextAvailable: 0,
	};
}

/** @param {NS} ns **/
async function saveState(ns, state) {
	await ns.write("/tmp/hacker-state.txt", JSON.stringify(state), "w");
}
