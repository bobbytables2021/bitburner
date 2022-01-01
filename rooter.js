// This walks the hosts to see if we can root
// anything.

import { GetHosts } from "util.js";

/** @param {NS} ns **/
export async function main(ns) {
	const hosts = GetHosts(ns);
	const level = ns.getHackingLevel();
	for (const host of hosts) {
		if (host.hasAdminRights) {
			continue;
		}
		var portsOpened = 0;
		if (ns.fileExists("BruteSSH.exe")) {
			ns.brutessh(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("FTPCrack.exe")) {
			ns.ftpcrack(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("relaySMTP.exe")) {
			ns.relaysmtp(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("HTTPWorm.exe")) {
			ns.httpworm(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("SQLInject.exe")) {
			ns.sqlinject(host.hostname);
			portsOpened++;
		}
		if (level >= host.requiredHackingSkill && 
			portsOpened >= host.numOpenPortsRequired) {
			ns.nuke(host.hostname);
		}
	}
}
