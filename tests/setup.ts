process.env.DATABASE_PATH = ':memory:';
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.VITEST = '1';
process.env.PAYMENT_PROVIDER = 'stub';
process.env.SHIPPING_PROVIDER = 'flat';
process.env.STORE_GSTIN = '33ABCDE1234F1Z5';
process.env.UPLOAD_DIR = require('os').tmpdir() + '/csc-test-uploads';
