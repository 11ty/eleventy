export async function data() {
  return new Promise((resolve, reject) => {
    setTimeout(function () {
      resolve({ name: "Ted" });
    }, 100);
  });
}

export async function render({ name }) {
  return new Promise((resolve, reject) => {
    setTimeout(function () {
      resolve(`<p>${name}</p>`);
    }, 100);
  });
}
