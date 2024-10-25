import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const ADD_BALANCE_COMMAND = {
  name: 'add-balance',
  description: 'Add balance to player',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  options: [
    {
      type: 4,
      name: 'amount',
      description: 'Amount to add',
      required: true,
    },
  ],
};

const ALL_COMMANDS = [ADD_BALANCE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
