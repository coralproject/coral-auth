#!/usr/bin/env node

const program = require('commander');
const pkg = require('./package.json');
const prompt = require('prompt');

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

      if (result.email === '') {
        return reject(new Error('Email is required'));
      }

      if (result.password === '') {
        return reject(new Error('Password is required'));
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

function listUsers() {
  const Table = require('cli-table');
  const User = require('./models/user');
  const mongoose = require('./mongoose');

  User
    .find()
    .exec()
    .then((users) => {
      let table = new Table({
        head: ['ID', 'Display Name']
      });

      users.forEach((user) => {
        table.push([user.id, user.displayName]);
      });

      console.log(table.toString());
      mongoose.disconnect();
    })
    .catch((err) => {
      console.error(err);
      mongoose.disconnect();
    });
}

program
  .version(pkg.version);

program
  .command('create')
  .action(createUser);

program
  .command('list')
  .action(listUsers);

program.parse(process.argv);
