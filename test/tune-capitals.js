/* Dev-only: the calibration search of test/tune-bot.js on the Capitals pack (kept under its old name; the two files used to be copies).
     node test/tune-capitals.js <beginner|medium|expert> [evals=150] [gamesPerCell=250] [seed=1] */
if (process.env.NODE_TEST_CONTEXT) process.exit(0);   // `node --test` runs every file in test/: this is a dev tool
process.env.PACK = process.env.PACK || 'capitals';
require('./tune-bot.js');
