# /**
#  * Outputs chart data where:
#  *   `x` contains transaction number
#  *   `y` contains estiamted sell share reward for one mToken
#  * 
#  * To run the script, execute the following:
#  *   `./scripts/chartInvestsAndSells.sh`
#  * 
#  * The chart requires `gnuplot` to be installed on the system!
#  * 
#  * The script accepts 4 parameters: 
#  *   - The first parameter defines how many investments shall be executed (number of datapoints in the chart), 
#  *     the default value is 100
#  *   - The second parameter specifies percentage of investments (as opposed to sells), the default is 70. [Be 
#  *     careful with less than 50 values, because we cant drop below 0 total invested amount]
#  *   - The third parameter specifies minimal investment amount in MEM, the default is 1
#  *   - The fourth parameter specifies maximal investment amount in MEM, the default is 1000
#  *     [The invested/sold amount is computed as a random number between the given boundaries for each tx separately]
#  * 
#  * Example of executing the script with parameters: `./scripts/chartInvestsAndSells.sh 1000 75 10 250`.
#  *  The parameters order cannot be changed, sorry :(
#  * 
#  * NOTE: all the values on outputs and inputs are *not* in wei.
#  */

mkdir -p charts
docker-compose up -d
docker-compose exec builder sh ./scripts_container/chartInvestsAndSells.sh $@