let isScheduling = false;

const setIsScheduling = value => (isScheduling = value);

const getIsScheduling = () => isScheduling;

module.exports = { setIsScheduling, getIsScheduling };
