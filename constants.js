export const CONSTANT = {
	workerScripts: ["grow.js", "hack.js", "weaken.js"],
	purchasedPrefix: "ps-",
	initDelay: 500,
	hwgwSpacing: 100,

	securityEpsilon: 1,
	growEpsilon: 1.05,
	hackLimit: 0.5,
	hackDrift: 0.002,
	hacksPerWeaken: 200,
	hackSize: 1.7,
	weakenEffect: 0.05,
	weakenSize: 1.75,
	growDrift: 0.004,
	growSize: 1.75,
	// This should be 12, but for some reason 12 causes drift.
	growsPerWeaken: 11,
}
