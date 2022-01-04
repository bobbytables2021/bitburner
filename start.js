// This is the starting script that bootstraps
// the init script on n00dles and then preps
// foodnstuff for running all of the management
// scripts.
// These two were chosen because they don't need
// any ports opened and start with the right
// amount of ram.

/** @param {NS} ns **/
export async function main(ns) {
	if (ns.isRunning("init.js", "n00dles")) {
		ns.kill("init.js", "n00dles");
	}
	ns.nuke("n00dles");
	await ns.scp("init.js", "home", "n00dles");
	ns.nuke("foodnstuff");
	const scripts = ns.ls("home", ".js");
	await ns.scp(scripts, "home", "foodnstuff");
	ns.exec("init.js", "n00dles");
}
