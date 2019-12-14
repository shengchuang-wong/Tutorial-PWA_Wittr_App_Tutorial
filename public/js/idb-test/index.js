import idb from 'idb';

const dbPromise = idb.open('test_db', 6, (upgradeDb) => {

  let peopleStore

  switch(upgradeDb.oldVersion) {
    case 0:
      const keyValStore = upgradeDb.createObjectStore('keyval')
      keyValStore.put('world', 'hello')
    case 1:
      upgradeDb.createObjectStore('people', { keyPath: 'name' })
    case 2:
      peopleStore = upgradeDb.transaction.objectStore('people')
      peopleStore.createIndex('animal', 'favoriteAnimal')
    case 5:
      peopleStore = upgradeDb.transaction.objectStore('people')
      peopleStore.createIndex('age', 'age')
  }
})

dbPromise.then(db => {
  const tx = db.transaction('keyval')
  const keyValStore = tx.objectStore('keyval')
  return keyValStore.get('hello')
}).then(val => {
  console.log(`The value of the "hello" is ${val}`)
})

dbPromise.then(db => {
  const tx = db.transaction('keyval', 'readwrite');
  const keyValStore = tx.objectStore('keyval')
  keyValStore.put('bar', 'foo')
  return tx.complete
}).then(() => {
  console.log(`Added to foo:bar to keyval`)
})

dbPromise.then(db => {
  const tx = db.transaction('keyval', 'readwrite')
  const keyValStore = tx.objectStore('keyval')
  keyValStore.put('dragon', 'favoriteAnimal')
  return tx.complete
}).then(() => {
  console.log(`Added my favoriteAnimal into indexedDB`)
})

dbPromise.then(db => {
  const tx = db.transaction('people', 'readwrite')
  const peopleStore = tx.objectStore('people')

  peopleStore.put({
    name: 'Sam Munoz',
    age: 25,
    favoriteAnimal: 'dog'
  })

  peopleStore.put({
    name: 'Tim Tong',
    age: 30,
    favoriteAnimal: 'cat'
  })

  peopleStore.put({
    name: 'Tam Cat',
    age: 20,
    favoriteAnimal: 'cat'
  })

  return tx.complete
}).then(() => {
  console.log('People added')
})

dbPromise.then(db => {
  const tx = db.transaction('people')
  const peopleStore = tx.objectStore('people')
  const animalIndex = peopleStore.index('animal')

  return animalIndex.getAll('cat')
}).then(people => {
  console.log(`People`, people)
})

dbPromise.then(db => {
  const tx = db.transaction('people')
  const peopleStore = tx.objectStore('people')
  const ageIndex = peopleStore.index('age')

  return ageIndex.getAll()
}).then(people => {
  console.log(`People by age`, people)
})

dbPromise.then(db => {
  const tx = db.transaction('people')
  const peopleStore = tx.objectStore('people')
  const ageIndex = peopleStore.index('age')

  return ageIndex.openCursor()
}).then(function logPerson(cursor) {
  if(!cursor) return
  console.log('Cursored at:', cursor.value.name)
  // cursor.update(newValue)
  // cursor.delete()
  return cursor.continue().then(logPerson)
}).then(() => {
  console.log('Done cursoring')
})

// var dbPromise = idb.open('test-db', 1, function(upgradeDb) {
//   var keyValStore = upgradeDb.createObjectStore('keyval');
//   keyValStore.put("world", "hello");
// });

// // read "hello" in "keyval"
// dbPromise.then(function(db) {
//   var tx = db.transaction('keyval');
//   var keyValStore = tx.objectStore('keyval');
//   return keyValStore.get('hello');
// }).then(function(val) {
//   console.log('The value of "hello" is:', val);
// });

// // set "foo" to be "bar" in "keyval"
// dbPromise.then(function(db) {
//   var tx = db.transaction('keyval', 'readwrite');
//   var keyValStore = tx.objectStore('keyval');
//   keyValStore.put('bar', 'foo');
//   return tx.complete;
// }).then(function() {
//   console.log('Added foo:bar to keyval');
// });

// dbPromise.then(function(db) {
//   // TODO: in the keyval store, set
//   // "favoriteAnimal" to your favourite animal
//   // eg "cat" or "dog"
// });