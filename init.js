// This is the primary script that starts
// and monitors the others. It uses almost
// exactly 4GB, perfect for n00dles. It
// runs the management scripts on foodnstuff
// since that is the other server that 
// only require hacking level 1 and no ports.

const manager = "foodnstuff";

/** @param {NS} ns **/
async function lauch(ns, script) {
	ns.exec(script, manager);
	while (ns.isRunning(script, manager)) {
		await ns.sleep(1000);
	}
}
export async function main(ns) {
	await lauch(ns, "network.js");
	await lauch(ns, "copy.js");
	await lauch(ns, "rooter.js");
}
