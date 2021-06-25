# /**
#  * Prints chart where:
#  *   `x` contains totalSupply
#  *   `y` contains estiamted sell share reward for one mToken
#  * 
#  * To run the script, execute the following:
#  *   `./scripts/chartInvestsOnly.sh`
#  * 
#  * The chart requires `gnuplot` to be installed on the system!
#  * 
#  * The script accepts 2 parameters: 
#  *   - The first parameter defines how many investments shall be executed  (number of datapoints in the chart), 
#  *     the default value is 100
#  *   - The second parameter specifies how much MEM is invested in each step (the default is 100)
#  *  
#  * Example of executing the script with parameters: `./scripts/chartInvestsOnly.sh 1000 10`.
#  *  The parameters order cannot be changed, sorry :(
#  * 
#  * NOTE: all the values on outputs and inputs are *not* in wei.
#  */

docker-compose exec builder npx truffle build 
docker-compose exec builder npx truffle migrate --reset 
docker-compose exec builder npx truffle exec ./scripts/simulateInvestsOnly.js $@ > chart_data_raw.txt

DATA_START_LINE=`cat chart_data_raw.txt | grep -n "Printing chart data:" | cut -d ':' -f1`
cat chart_data_raw.txt | tail -n +$DATA_START_LINE | head -n -2 | gnuplot -p -e 'plot "/dev/stdin" using 1:2 with lines'
