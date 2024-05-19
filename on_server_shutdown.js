const fs = require('fs');
const path = require('path');

// Delete all files in the images directory
const directory = 'images';
fs.readdir(directory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(directory, file), err => {
      if (err) throw err;
    });
  }
});

console.log('All files in the images directory have been deleted');
console.log('Bye!');