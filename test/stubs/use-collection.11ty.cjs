module.exports = function({ collections }) {
  return `<ul>${collections.post
    .map(post => `<li>${post.data.title}</li>`)
    .join("")}</ul>`;
};
