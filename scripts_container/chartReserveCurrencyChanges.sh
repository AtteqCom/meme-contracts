npx truffle build 
npx truffle migrate --reset 
npx truffle exec ./scripts/simulateReserveCurrencyChanges.js $@ > chart_data_raw.txt

DATA_START_LINE=`cat chart_data_raw.txt | grep -n "Printing chart data:" | cut -d ':' -f1`
cat chart_data_raw.txt | tail -n +$DATA_START_LINE | head -n -2 > chart_data.txt
gnuplot -e '
  set terminal png size 1920,1080; 
  set output "charts/reserveCurrencyChanges.png";
  set title "Sell share reward for different reserve currency amounts";
  set xlabel "Reserve currency amount";
  plot "chart_data.txt" using 1:2 with lines title "Estimated sell share reward for one mToken"
'
