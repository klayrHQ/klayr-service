const CHAIN_ID_LENGTH = 4;
const LOCAL_ID_LENGTH = 4;

const CHAIN_ID_STRING_LENGTH = CHAIN_ID_LENGTH * 2;
const LOCAL_ID_STRING_LENGTH = LOCAL_ID_LENGTH * 2;
const TOKEN_ID_STRING_LENGTH = CHAIN_ID_STRING_LENGTH + LOCAL_ID_STRING_LENGTH;

const splitTokenIDString = tokenID => {
	if (tokenID.length !== TOKEN_ID_STRING_LENGTH) {
		throw new Error(`Token ID must have length ${TOKEN_ID_STRING_LENGTH}`);
	}

	const chainID = tokenID.slice(0, CHAIN_ID_STRING_LENGTH);
	const localID = tokenID.slice(CHAIN_ID_STRING_LENGTH);

	return [chainID, localID];
};

module.exports = { splitTokenIDString };
