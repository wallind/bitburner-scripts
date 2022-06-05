/**
 * TODO:
 * 
 * @param arr 
 * 
 * https://stackoverflow.com/a/23133681/8876886
 */
export const isStringArray = (testValue: any): boolean => {
	return Array.isArray(testValue) && testValue.every(elem => typeof elem === "string")
}
