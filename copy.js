// You can copy to a host, even without root access. This
// script copys the given files to the entire network from
// home. If no arguments are given, it copies the default
// worker scripts.

import { GetHosts } from "./util.js";
import { CONSTANT } from "./constants.js";

/** @param {NS} ns **/
export async function main(ns) {
	const hosts = GetHosts(ns);
	const scripts = CONSTANT.workerScripts;
	const files = ns.args.length > 0 ? ns.args : scripts;
	for (const host of hosts) {
		await ns.scp(files, "home", host.hostname);
	}
}
