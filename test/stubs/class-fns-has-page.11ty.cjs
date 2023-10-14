class TestWithPage {
  get page() {
    return "this-is-my-page";
  }

  render(data) {
    data.avaTest.is(this.page, "this-is-my-page");
    data.avaTest.is(data.page.url, "/hi/");
  }
}

module.exports = TestWithPage;
