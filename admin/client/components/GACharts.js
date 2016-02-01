import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';

var GACharts = React.createClass({
	displayName: 'GACharts',
	componentDidMount () {
    this.loadItems(this.mountGACharts);
	},

  mountGACharts (zoneId, contentId) {
    console.log(zoneId);
    console.log(contentId);
    gapi.analytics.ready(function() {

		  var CLIENT_ID = '839712905523-8u9au5ruj16006o97805foftd65ja04o.apps.googleusercontent.com';
		  gapi.analytics.auth.authorize({
		    container: 'auth-button',
		    clientid: CLIENT_ID,
		  });


		  gapi.analytics.auth.on('success', function(response) {

				var now = moment();

				var impressionPerWeek = query({
					'ids': 'ga:71642809',
					'dimensions': 'ga:date',
					'metrics': 'ga:totalEvents',
					'filters': 'ga:eventAction=='+zoneId+'_'+contentId+'_impression',
					'start-date': moment(now).subtract(1, 'day').day(-6).format('YYYY-MM-DD'),
					'end-date': moment(now).format('YYYY-MM-DD')
				});

				var clicksPerWeek = query({
					'ids': 'ga:71642809',
					'dimensions': 'ga:date',
					'metrics': 'ga:totalEvents',
					'filters': 'ga:eventAction=='+zoneId+'_'+contentId+'_click',
					'start-date': moment(now).subtract(1, 'day').day(-6).format('YYYY-MM-DD'),
					'end-date': moment(now).format('YYYY-MM-DD')
				});

				Promise.all([impressionPerWeek, clicksPerWeek]).then(function(results) {

					var impressionPerWeekData = results[0].rows.map(function(row) { return +row[1]; });
					var clicksPerWeekData = results[1].rows.map(function(row) { return +row[1]; });
					var labels = results[1].rows.map(function(row) { return +row[0]; });

					labels = labels.map(function(label) {
		        return moment(label, 'YYYYMMDD').format('ddd');
		      });

		      var data = {
			        labels : labels,
			        datasets : [
			          {
			            label: 'Clicks Per Week',
                  fillColor : 'rgba(151,187,205,0)',
			            strokeColor : 'rgba(151,187,205,1)',
			            pointColor : 'rgba(151,187,205,1)',
			            pointStrokeColor : '#fff',
			            data : impressionPerWeekData
			          },
			          {
			            label: 'impression Per Week',
			            fillColor : 'rgba(151,187,205,0)',
                  strokeColor : '#FF0000',
                  pointColor : '#FF5F5F',
			            pointStrokeColor : '#fff',
			            data : clicksPerWeekData
			          }
			        ]
			      };

						var ctx = document.getElementById("impressionAndClicksPerWeek").getContext("2d");
			      new Chart(ctx).Line(data);

						var zipped = _.zip(clicksPerWeekData, impressionPerWeekData);
						var ctrWeekData = zipped.map(function(col) {
							var ctr = (col[0]/col[1]) * 100;
							return _.isNaN(ctr) ? 0 : ctr;
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

						var ctrCtx = document.getElementById("ctr").getContext("2d");
			      new Chart(ctrCtx).Line(ctrData);
					});

				});

			});

			function query(params) {
				return new Promise(function(resolve, reject) {
					var data = new gapi.analytics.report.Data({query: params});
					data.once('success', function(response) { resolve(response); })
							.once('error', function(response) { reject(response); })
							.execute();
				});
			}
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
			// TODO: indicate pagination & link to main list view
      try {
        var zoneId = items.results[0].fields.zoneId;
        callback(zoneId, itemData.fields.contentId);
      } catch (e) {
        console.log(e.message);
      }
		});
	},

	render () {
    return (
      <div>
        <section id="auth-button"></section>
        <h3 class="form-heading">Weekly Impressions and Clicks</h3>
        <canvas id="impressionAndClicksPerWeek" width="550" height="250"></canvas>
        <h3 class="form-heading">Weekly CTR</h3>
        <canvas id="ctr" width="550" height="250"></canvas>
      </div>
    );
	}
});

module.exports = GACharts;
