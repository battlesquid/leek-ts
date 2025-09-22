export const combinePermissions = (permissions: bigint[]) => {
	return permissions.reduce((acc, curr) => acc | curr);
};
