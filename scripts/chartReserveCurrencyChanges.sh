# /**
#  * Prints chart where:
#  *   `x` contains reserve currency amount
#  *   `y` contains estimated sell share reward for one mToken
#  * 
#  * To run the script, execute the following:
#  *   `./scripts/chartReserveCurrencyChanges.sh`
#  * 
#  * The chart requires `gnuplot` to be installed on the system!
#  * 
#  * The script accepts 2 parameters:
#  *   - The first parameter defines how many transfers of the reserve currency to the mToken shall be executed 
#  *     (number of datapoints in the chart), the default value is 100
#  *   - The second parameter defines how much of the reserve currency should be transfered to the mToken at each
#  *     transfer, the default is 10
#  * 
#  * Example of executing the script with parameters: `./scripts/chartReserveCurrencyChanges.sh 150 1000`/
#  * 
#  * NOTE: all the values on outputs and inputs are *not* in wei.
#  */

mkdir -p charts
docker-compose up -d
docker-compose exec builder sh ./scripts_container/chartReserveCurrencyChanges.sh $@
