// This file stores the amount in a file to notify all scripts that
// we are saving up.

/** @param {NS} ns **/
export async function main(ns) {
	if (ns.args.length == 0) {
		ns.tprint("USAGE: save-money.js <Amount of money to reserve>");
		return;
	}
	await ns.write("/tmp/reserve-money.txt", ns.args[0], "w");
	await ns.scp("/tmp/reserve-money.txt", "home", "foodnstuff");
}
