/**
 * TODO:
 */
export interface InfraUpgradeCandidate {
	cost: number
	type: InfraUpgradeType
	nodeIndex?: number
	desiredRam?: number
}

/**
 * TODO:
 */
export enum InfraUpgradeType {
	RAM = 'ram',
	CORE = 'core',
	LEVEL = 'level',
	NODE_PURCHASE = 'node-purchase',
	HACKERMAN_PURCHASE = 'hackerman-purchase',
}
