class Sortable {
  constructor() {
    this.sortAscending = true;
    this.sortNumeric = false;
  }

  isSortAscending() {
    return this.sortAscending;
  }

  isSortNumeric() {
    return this.sortNumeric;
  }

  setSortAscending(isAscending) {
    this.sortAscending = isAscending;
  }

  setSortNumeric(isNumeric) {
    this.sortNumeric = isNumeric;
  }

  static sortNumericAscending(a, b) {
    return a - b;
  }

  static sortNumericDescending(a, b) {
    return b - a;
  }

  static sortAlphabeticAscending(a, b) {
    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    }
    return 0;
  }

  static sortAlphabeticDescending(a, b) {
    if (a > b) {
      return -1;
    } else if (a < b) {
      return 1;
    }
    return 0;
  }

  getSortFunction() {
    if (this.sortNumeric) {
      if (this.sortAscending) {
        return Sortable.sortNumericAscending;
      } else {
        return Sortable.sortNumericDescending;
      }
    } else {
      if (this.sortAscending) {
        return Sortable.sortAlphabeticAscending;
      } else {
        return Sortable.sortAlphabeticDescending;
      }
    }
  }
}

module.exports = Sortable;
