#!/usr/bin/env node

const program = require('commander');
const pkg = require('./package.json');
const prompt = require('prompt');

/**
 * Prompts for input and registers a user based on those.
 */
function createUser() {
  const User = require('./models/user');
  const mongoose = require('./mongoose');

  return new Promise((resolve, reject) => {
    prompt.start();

    prompt.get([
      {
        name: 'email',
        description: 'Email',
        format: 'email',
        required: true
      },
      {
        name: 'password',
        description: 'Password',
        hidden: true,
        required: true
      },
      {
        name: 'confirmPassword',
        description: 'Confirm Password',
        hidden: true,
        required: true
      },
      {
        name: 'displayName',
        description: 'Display Name',
        required: true
      }
    ], (err, result) => {
      if (err) {
        return reject(err);
      }

      if (result.password !== result.confirmPassword) {
        return reject(new Error('Passwords do not match'));
      }

      User.createLocalUser(result.email.trim(), result.password.trim(), result.displayName.trim(), (err, user) => {
        if (err) {
          return reject(err);
        }

        resolve(user);
      });
    });
  }).then((user) => {
    console.log(`Created user ${user.id}.`);
    mongoose.disconnect();
  }).catch((err) => {
    console.error(err);
    mongoose.disconnect();
  });
}

/**
 * Lists all the users registered in the database.
 */
function listUsers() {
  const Table = require('cli-table');
  const User = require('./models/user');
  const mongoose = require('./mongoose');

  User
    .find()
    .exec()
    .then((users) => {
      let table = new Table({
        head: ['ID', 'Display Name', 'Profiles', 'State']
      });

      users.forEach((user) => {
        table.push([
          user.id,
          user.displayName,
          user.profiles.map((p) => p.provider).join(', '),
          user.disabled ? 'Disabled' : 'Enabled'
        ]);
      });

      console.log(table.toString());
      mongoose.disconnect();
    })
    .catch((err) => {
      console.error(err);
      mongoose.disconnect();
    });
}

/**
 * Merges two users using the specified ID's.
 * @param  {String} dstUserID id of the user to which is the target of the merge
 * @param  {String} srcUserID id of the user to which is the source of the merge
 */
function mergeUsers(dstUserID, srcUserID) {
  const User = require('./models/user');
  const mongoose = require('./mongoose');

  User
    .mergeUsers(dstUserID, srcUserID)
    .then(() => {
      console.log(`User ${srcUserID} was merged into user ${dstUserID}.`);
      mongoose.disconnect();
    }).catch((err) => {
      console.error(err);
      mongoose.disconnect();
    });
}

/**
 * Disable a given user.
 * @param  {String} userID the ID of a user to disable
 */
function disableUser(userID) {
  const User = require('./models/user');
  const mongoose = require('./mongoose');

  User.disableUser(userID, (err) => {
    if (err) {
      console.log(err);
      mongoose.disconnect();
      return;
    }

    console.log(`User ${userID} was disabled.`);
    mongoose.disconnect();
  });
}

/**
 * Enabled a given user.
 * @param  {String} userID the ID of a user to enable
 */
function enableUser(userID) {
  const User = require('./models/user');
  const mongoose = require('./mongoose');

  User.enableUser(userID, (err) => {
    if (err) {
      console.log(err);
      mongoose.disconnect();
      return;
    }

    console.log(`User ${userID} was enabled.`);
    mongoose.disconnect();
  });
}

//==============================================================================
// Setting up the program command line arguments.
//==============================================================================

program
  .version(pkg.version);

program
  .command('create')
  .description('create a new user')
  .action(createUser);

program
  .command('list')
  .description('list all the users in the database')
  .action(listUsers);

program
  .command('merge <dstUserID> <srcUserID>')
  .description('merge srcUser into the dstUser')
  .action(mergeUsers);

program
  .command('disable <userID>')
  .description('disable a given user from logging in')
  .action(disableUser)

program
  .command('enable <userID>')
  .description('enable a given user from logging in')
  .action(enableUser)

program.parse(process.argv);
