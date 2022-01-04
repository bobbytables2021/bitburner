// This walks the hosts to see if we can root
// anything.

import { GetHosts } from "./util.js";

/** @param {NS} ns **/
export async function main(ns) {
	const hosts = GetHosts(ns);
	const level = ns.getHackingLevel();
	for (const host of hosts) {
		if (host.hasAdminRights) {
			continue;
		}
		var portsOpened = 0;
		if (ns.fileExists("BruteSSH.exe", "home")) {
			ns.brutessh(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("FTPCrack.exe", "home")) {
			ns.ftpcrack(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("relaySMTP.exe", "home")) {
			ns.relaysmtp(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("HTTPWorm.exe", "home")) {
			ns.httpworm(host.hostname);
			portsOpened++;
		}
		if (ns.fileExists("SQLInject.exe", "home")) {
			ns.sqlinject(host.hostname);
			portsOpened++;
		}
		if (level >= host.requiredHackingSkill &&
			portsOpened >= host.numOpenPortsRequired) {
			ns.nuke(host.hostname);
		}
	}
}
