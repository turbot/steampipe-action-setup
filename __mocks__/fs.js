const promises = jest.requireActual('fs/promises')
const mockFs = jest.createMockFromModule('fs');
mockFs.promises = promises;
module.exports = mockFs;
