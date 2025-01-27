const o = {
    a: 1,
    b: 2,
    c: 3
}

const a = Object.values(o); // [1, 2, 3]
const b = Object.keys(o); // ['a', 'b', 'c']
const c = Object.entries(o); // [['a', 1], ['b', 2], ['c', 3]]

console.log(a);
console.log(b);
console.log(c);
