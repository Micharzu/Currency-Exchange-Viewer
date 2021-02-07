//select lists
const toPLNList = document.querySelector(".currency-to-pln-list");
const chosenCurrencyList = document.querySelector(".chosen-currency-list");

//
const baseURL = "https://api.exchangeratesapi.io/";
const latestPLNDataURL = "https://api.exchangeratesapi.io/latest?base=PLN";
let currencyPeriodDataURL =
  "https://api.exchangeratesapi.io/history?start_at=2018-01-01&end_at=2018-09-01&base=USD";

// data object for right list
let currencyPeriodDataObj = {};

// left list item being the base for the right list
let activeBase;

//get data for left list
const getLatestData = async () => {
  const latestData = await fetch(latestPLNDataURL).then((res) => res.json());
  let formattedData = {};

  //fill left list
  if (latestData.hasOwnProperty("rates")) {
    Object.entries(latestData.rates).map(([key, value]) => {
      let currencyToPLN = 1 / value;
      currencyToPLN = currencyToPLN.toFixed(10);
      formattedData[key] = currencyToPLN;
      createToPNLListItem(key, currencyToPLN);
    });
  }
};

// create single left list item
const createToPNLListItem = (currency, value) => {
  let liContentArr = [
    "1 " + currency,
    '<i class="fa fa-arrow-right" aria-hidden="true"></i>',
    value + " PLN",
  ];

  const li = document.createElement("li");
  li.id = `${currency}-to-PLN-latest`;

  // set new active currency and update right list on click on left list item
  li.addEventListener("click", () => {
    if (activeBase) {
      activeBase.classList.remove("active");
    }
    li.classList.add("active");
    activeBase = li;
    updateCurrencyPeriodData(currency);
  });

  const liContent = liContentArr.map((item) => {
    let span = document.createElement("span");
    span.innerHTML = item;
    return span;
  });

  li.append(...liContent);
  toPLNList.appendChild(li);
};

// calculate dates for right list query
const getDateParams = () => {
  let dateParams = {
    firstDay: "",
    lastDay: "",
  };
  let today = new Date();
  const weekDay = today.getDay();
  let startDay = new Date();

  // get previous monday date
  let dataPeriod = 6 + weekDay;
  if (weekDay === 0) {
    dataPeriod += 7;
  }

  startDay.setDate(today.getDate() - dataPeriod);

  //fix for cases right before/after the midnight in some timezones
  const offset = startDay.getTimezoneOffset();
  startDay = new Date(startDay.getTime() - offset * 60 * 1000);
  today = new Date(today.getTime() - offset * 60 * 1000);

  // date to format accepted by api
  dateParams.firstDay = startDay.toISOString().split("T")[0];
  dateParams.lastDay = today.toISOString().split("T")[0];
  return dateParams;
};

const setCurrencyPeriodDataURL = (currency) => {
  const dateParams = getDateParams();
  currencyPeriodDataURL = `${baseURL}history?start_at=${dateParams.firstDay}&end_at=${dateParams.lastDay}&base=${currency}`;
};
//get data for right list
const getCurrencyPeriodData = async () => {
  const currencyPeriodData = await fetch(currencyPeriodDataURL).then((res) =>
    res.json()
  );
  formatCurrencyPeriodData(currencyPeriodData);
};

// format data to {base: baseCurrencyCode, comparedCurrencyCode: [date: dateValue, value: currencyValue]}
const formatCurrencyPeriodData = (currencyPeriodData) => {
  if (
    currencyPeriodData.hasOwnProperty("rates") &&
    currencyPeriodData.hasOwnProperty("base")
  ) {
    Object.entries(currencyPeriodData.rates).map(([key_date, value_obj]) => {
      Object.entries(value_obj).map(([key_curr, value]) => {
        let currencyDataObj = { date: key_date, value: value };
        if (currencyPeriodDataObj.hasOwnProperty([key_curr])) {
          currencyPeriodDataObj[key_curr].push(currencyDataObj);
        } else {
          if (key_curr !== currencyPeriodData.base) {
            currencyPeriodDataObj[key_curr] = [currencyDataObj];
          }
        }
      });
    });
    Object.entries(currencyPeriodDataObj).map(([key, value]) => {
      currencyPeriodDataObj[key].sort(function (a, b) {
        return Date.parse(a.date) - Date.parse(b.date);
      });
    });
    currencyPeriodDataObj.base = currencyPeriodData.base;
    createCurrencyPeriodListItems();
  }
};

// fill the right list
const createCurrencyPeriodListItems = () => {
  Object.entries(currencyPeriodDataObj).map(([key, value]) => {
    if (key !== "base") {
      let fixedDecimalValue = value[value.length - 1].value.toFixed(10);
      createCurrencyPeriodListItem(
        currencyPeriodDataObj.base,
        key,
        fixedDecimalValue.substring(0, 12)
      );
    }
  });
};

// create single right list item
const createCurrencyPeriodListItem = (
  baseCurrency,
  comparedCurrency,
  value
) => {
  liContentArr = [
    baseCurrency,
    '<i class="fa fa-arrow-right" aria-hidden="true"></i>',
    value + " " + comparedCurrency,
  ];

  const li = document.createElement("li");
  li.classList.add("chosen-currency-list-item");
  li.id = `${baseCurrency}-to-${comparedCurrency}-period`;

  const dataContainer = document.createElement("div");
  dataContainer.classList.add("data-container");

  const canvasContainer = document.createElement("div");
  canvasContainer.classList.add("canvas-container");

  const canvas = document.createElement("canvas");
  canvas.id = `${baseCurrency}-to-${comparedCurrency}-canvas`;

  // add chart to canvas on click on list item
  li.addEventListener("click", function () {
    li.classList.toggle("active");

    if (li.classList.contains("active")) {
      setTimeout(() => setUpCanvas(canvas.id, comparedCurrency), 1000);
    }
  });

  const data = liContentArr.map((item) => {
    let span = document.createElement("span");
    span.innerHTML = item;
    return span;
  });

  dataContainer.append(...data);
  li.appendChild(dataContainer);
  canvasContainer.appendChild(canvas);
  li.appendChild(canvasContainer);
  chosenCurrencyList.appendChild(li);
};

const setUpCanvas = (canvasId, comparedCurrency) => {
  let dateArr = [];
  let valueArr = [];

  // format dates to dd-mm
  currencyPeriodDataObj[comparedCurrency].forEach((arrEl) => {
    dateArr.push(arrEl.date.substr(-2, 2) + arrEl.date.substr(-6, 3));
    valueArr.push(arrEl.value);
  });

  // create chart
  const myChart = new Chart(canvasId, {
    type: "line",
    data: {
      labels: dateArr,
      datasets: [
        {
          label: `Worth of ${currencyPeriodDataObj.base} in ${comparedCurrency}`,
          data: valueArr,
          borderColor: "rgba(0, 0, 0, 0.9)",
          borderWidth: 2,
          lineTension: 0,
          fill: false,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      legend: {
        labels: {
          boxWidth: 0,
        },
      },
    },
  });
};

//cleanup
const clearCurrencyPeriodData = () => {
  currencyPeriodDataObj = {};
  chosenCurrencyList.textContent = "";
};

// update right list
const updateCurrencyPeriodData = (currency) => {
  clearCurrencyPeriodData();
  setCurrencyPeriodDataURL(currency);
  getCurrencyPeriodData();
};

//initialization
getLatestData();
updateCurrencyPeriodData("PLN");
