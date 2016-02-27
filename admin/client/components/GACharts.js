import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';

var GACharts = React.createClass({
	displayName: 'GACharts',
	componentDidMount () {
		var that = this;
    this.loadItems((zones, contentId) => {
			const zoneIds = zones.map((zone) => zone.fields.zoneId)
			that.generateCharts(zoneIds, contentId)
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

		this.getImpressionAndClickDataFromGA(startDate, endDate, zoneId, contentId, (impressionGAData, clicksGAData) => {

			var impressionsData = impressionGAData.rows.map(function(row) { return +row[1]; });
			var clicksData = clicksGAData.rows.map(function(row) { return +row[1]; });
			var labels = impressionGAData.rows.map(function(row) { return +row[0]; });

			labels = labels.map(function(label) {
				return moment(label, 'YYYYMMDD').format('ddd');
			});

			that.generateImpressionsAndClicksChart(labels, impressionsData, clicksData, zoneId);
			that.generateCTRChart(labels, impressionsData, clicksData, zoneId);

		});
	},

	getImpressionAndClickDataFromGA (startDate, endDate, zoneId, contentId, callback) {
		const { itemData } = this.props;
		const { fields } = itemData;
		const { gaViewID } = fields;

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

	generateImpressionsAndClicksChart (labels, impressionsData, clicksData, zoneId) {
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
				'Impressions and Clicks for '+zoneId,
				'impressionAndClicks-'+zoneId,
				data
			);

			var ctx = document.getElementById('impressionAndClicks-'+zoneId).getContext("2d");
			new Chart(ctx).Line(data);
	},

	generateCTRChart (labels, impressionsData, clicksData, zoneId) {
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
			'CTR for '+zoneId,
			'ctr-'+zoneId,
			ctrData
		);

		var ctrCtx = document.getElementById('ctr-'+zoneId).getContext("2d");
		new Chart(ctrCtx).Line(ctrData);
	},

	query (params) {
		return new Promise(function(resolve, reject) {
			var data = new gapi.analytics.report.Data({query: params});
			data.once('success', function(response) { resolve(response); })
					.once('error', function(response) { reject(response); })
					.execute();
		});
	},

	appendLineChartToDOM (title, domID, data) {
		var newP = document.createElement("p");
		var newHeading = document.createTextNode(title);
		newP.appendChild(newHeading);

		var newCanvas = document.createElement("canvas");
		newCanvas.setAttribute('id', domID);

		newCanvas.setAttribute('width', 650);
		newCanvas.setAttribute('height', 350);

		document.querySelector('#reporting').appendChild(newP);
		document.querySelector('#reporting').appendChild(newCanvas);

		var ctx = document.getElementById(domID).getContext("2d");
		new Chart(ctx).Line(data);
	},

  loadItems (callback) {
		const { refList, relatedItemId, relationship, itemData } = this.props;
		if (!refList.fields[relationship.refPath]) {
			const err = (
				<Alert type="danger">
					<strong>Error:</strong> Related List <strong>{refList.label}</strong> has no field <strong>{relationship.refPath}</strong>
				</Alert>
			);
			return this.setState({ err });
		}
		refList.loadItems({
			filters: [{
				field: refList.fields[relationship.refPath],
				value: { value: relatedItemId },
			}],
		}, (err, items) => {
      try {
        callback(items.results, itemData.fields.contentId);
      } catch (e) {
        console.log(e.message);
      }
		});
	},

	render () {
    return (
      <div>
        <section id="auth-button"></section>
				<div id="reporting"></div>
      </div>
    );
	}
});

module.exports = GACharts;
