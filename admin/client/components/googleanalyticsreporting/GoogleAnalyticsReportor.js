import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { Spinner } from 'elemental';

var GoogleAnalyticsReportor = React.createClass({
	displayName: 'GoogleAnalyticsReportor',
	componentDidMount () {
		var that = this;
    this.loadItems((zoneIds) => {
			const contentId = this.props.itemData.fields.contentId;
			that.generateCharts(zoneIds, contentId);
		});
	},

  generateCharts (zoneIds, contentId) {
		var that = this;
    gapi.analytics.ready(function() {

		  gapi.analytics.auth.authorize({
		    container: 'auth-button',
		    clientid: '839712905523-8u9au5ruj16006o97805foftd65ja04o.apps.googleusercontent.com',
		  });

		  gapi.analytics.auth.on('success', function(response) {
				for (var i = 0; i < zoneIds.length; i++) {
					const zoneId = zoneIds[i];
					that.initReportGeneration(zoneId, contentId);
				}
			});

		});

  },

	initReportGeneration (zoneId, contentId) {
		var now = moment();
		var startDate = moment(now).subtract(1, 'day').day(-6).format('YYYY-MM-DD');
		var endDate = moment(now).format('YYYY-MM-DD');
		var that = this;

		const { itemData } = this.props;
		const { fields } = itemData;
		const gaViewIDs = fields.gaViewID.split(',');

		for (var i = 0; i < gaViewIDs.length; i++) {
			const gaViewID = gaViewIDs[i];

			this.createContainerIfDoesntExist(gaViewID);

			this.getImpressionAndClickDataFromGA(gaViewID, startDate, endDate, zoneId, contentId, (impressionGAData, clicksGAData) => {

				that.removeSpinner();

				var impressionsData = impressionGAData.rows.map(function(row) { return +row[1]; });
				var clicksData = clicksGAData.rows.map(function(row) { return +row[1]; });
				var labels = impressionGAData.rows.map(function(row) { return +row[0]; });
				var requestedDataViewId = impressionGAData.profileInfo.tableId;
				var containerHeading = impressionGAData.profileInfo.profileName;

				that.appendHeaderToViewContainer(containerHeading, requestedDataViewId);

				labels = labels.map(function(label) {
					return moment(label, 'YYYYMMDD').format('ddd');
				});

				const headingForImpressionsAndClicksReport = `Impressions and Clicks for ${zoneId}`;
				const mountAtDomIdForImpressionAndClicksReport = `impressionAndClicks-${zoneId}`;

				that.generateImpressionsAndClicksChart(
					labels,
					impressionsData,
					clicksData,
					headingForImpressionsAndClicksReport,
					mountAtDomIdForImpressionAndClicksReport,
					requestedDataViewId
				);


				const headingForCTRReport = `CTR for ${zoneId}`;
				const mountAtDomIdCTRReport = `ctr-${zoneId}`;

				that.generateCTRChart(labels,
					impressionsData,
					clicksData,
					headingForCTRReport,
					mountAtDomIdCTRReport,
					requestedDataViewId
				);

			});

		}
	},

	getImpressionAndClickDataFromGA (gaViewID, startDate, endDate, zoneId, contentId, callback) {

		var impressionPerWeek = this.query({
			'ids': gaViewID,
			'dimensions': 'ga:date',
			'metrics': 'ga:totalEvents',
			'filters': 'ga:eventAction=='+zoneId+'_'+contentId+'_impression',
			'start-date': startDate,
			'end-date': endDate
		});

		var clicksPerWeek = this.query({
			'ids': gaViewID,
			'dimensions': 'ga:date',
			'metrics': 'ga:totalEvents',
			'filters': 'ga:eventAction=='+zoneId+'_'+contentId+'_click',
			'start-date': startDate,
			'end-date': endDate
		});

		Promise.all([impressionPerWeek, clicksPerWeek]).then(function(results) {
			callback(results[0], results[1]);
		});
	},

	generateImpressionsAndClicksChart (labels, impressionsData, clicksData, heading, mountAtDomId, gaViewID) {
		var data = {
			labels : labels,
			datasets : [
				{
					label: 'impressions',
					fillColor : 'rgba(151,187,205,0)',
					strokeColor : 'rgba(151,187,205,1)',
					pointColor : 'rgba(151,187,205,1)',
					pointStrokeColor : '#fff',
					data : impressionsData
				},
				{
					label: 'clicks',
					fillColor : 'rgba(151,187,205,0)',
					strokeColor : '#FF0000',
					pointColor : '#FF5F5F',
					pointStrokeColor : '#fff',
					data : clicksData
				}]
			};

			this.appendLineChartToDOM(
				heading,
				mountAtDomId,
				gaViewID,
				data
			);
	},

	generateCTRChart (labels, impressionsData, clicksData, heading, mountAtDomId, gaViewID) {
		var zipped = _.zip(clicksData, impressionsData);
		var ctrWeekData = zipped.map(function(col) {
			var ctr = (col[0]/col[1]) * 100;
			return _.isNaN(ctr) ? 0 : ctr.toFixed(2);
		});

		var ctrData = {
				labels : labels,
				datasets : [
					{
						label: 'CTR',
						fillColor : 'rgba(220,220,220,0.1)',
						strokeColor : '#FF0000',
						pointColor : '#FF5F5F',
						pointStrokeColor : '#fff',
						data : ctrWeekData
					}
				]
			};

		this.appendLineChartToDOM(
			heading,
			mountAtDomId,
			gaViewID,
			ctrData
		);
	},

	query (params) {
		return new Promise(function(resolve, reject) {
			var data = new gapi.analytics.report.Data({query: params});
			data.once('success', function(response) { resolve(response); })
					.once('error', function(response) { reject(response); })
					.execute();
		});
	},

	appendLineChartToDOM (title, domID, containerId, data) {
		var cleanContainerId = `#${this.cleanUpViewIDOfSpecialCharacters(containerId)}`;
		var newP = document.createElement("p");
		var newHeading = document.createTextNode(title);
		newP.appendChild(newHeading);

    var legendsDiv = document.createElement("div");
    legendsDiv.setAttribute('class', `legends-${domID}`);

		var newCanvas = document.createElement("canvas");
		newCanvas.setAttribute('class', domID);

    var newWrapperDiv = document.createElement("div");
    newWrapperDiv.setAttribute('class', `${domID}-container`);

    document.querySelector(cleanContainerId).appendChild(newWrapperDiv);
		document.querySelector(`${cleanContainerId} .${domID}-container`).appendChild(newP);
    document.querySelector(`${cleanContainerId} .${domID}-container`).appendChild(legendsDiv);
		document.querySelector(`${cleanContainerId} .${domID}-container`).appendChild(newCanvas);

		var ctx = document.querySelector(`${cleanContainerId} .${domID}`).getContext("2d");
		var myChart = new Chart(ctx).Line(data);

    document.querySelector(`${cleanContainerId} .legends-${domID}`).innerHTML = myChart.generateLegend();
	},

	appendHeaderToViewContainer (heading, containerId) {
		var cleanContainerId = `#${this.cleanUpViewIDOfSpecialCharacters(containerId)}`;

		if (!document.querySelector(`${cleanContainerId} h3`)) {
			var newH3 = document.createElement("h3");
			var newHeading = document.createTextNode(heading);
			newH3.appendChild(newHeading);

			document.querySelector(cleanContainerId).appendChild(newH3);
		}
	},

	createContainerIfDoesntExist (gaViewID) {
		const newContainerID = this.cleanUpViewIDOfSpecialCharacters(gaViewID);
		if (!document.querySelector(`#${newContainerID}`)){
			var newViewIDContainer = document.createElement("div");
			newViewIDContainer.setAttribute('id', newContainerID);
			document.querySelector('#reporting').appendChild(newViewIDContainer);
		}
	},

	cleanUpViewIDOfSpecialCharacters (viewId) {
		return viewId.replace(':','');
	},

  loadItems (callback) {
		Promise.all(this.getRelationDataFetchPromises()).then(function(zonesResults) {

			let zoneIds = zonesResults.reduce(function (result, next) {

				var zoneId = next.results.map(function (zones) {
					return zones.fields.zoneId;
				})

				return result.concat(zoneId);

			}, []);

			callback(_.uniq(zoneIds));

		});
	},

	getRelationDataFetchPromises () {
		const { refList, relatedItemId, relationships, itemData } = this.props;
		let keys = Object.keys(relationships);

		return keys.map((key) => {
			return new Promise(function(resolve, reject) {
				let relationship = relationships[key];
				refList.loadItems({
					filters: [{
						field: refList.fields[relationship.refPath],
						value: { value: relatedItemId },
					}],
				}, (err, response) => {
						// callback(items.results, itemData.fields.contentId);
					if (err) {
						reject(err);
					} else {
						resolve(response);
					}
				});
			});
		});
	},

  removeSpinner () {
    document.querySelector('#reporting').removeChild(document.querySelector('.view-loading-indicator'));
  },

	render () {
    return (
      <div id="reporting-container">
        <h2>Reporting</h2>
        <section id="auth-button"></section>
				<div id="reporting">
          <div className="view-loading-indicator"><Spinner size="md" /></div>
        </div>
      </div>
    );
	}
});

module.exports = GoogleAnalyticsReportor;
