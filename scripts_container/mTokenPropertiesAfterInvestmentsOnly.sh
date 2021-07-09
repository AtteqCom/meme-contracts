npx truffle migrate --reset 
npx truffle exec ./scripts/mTokenPropertiesAfterInvestmentsOnly.js ./charts/mTokenPropertiesAfterInvestmentsOnly.csv

# remove first line which contains column names only
tail -n +2 ./charts/mTokenPropertiesAfterInvestmentsOnly.csv > /tmp/stats.csv
gnuplot -e '
  set terminal png size 1920,1080; 
  set datafile sep ",";
  set output "charts/mTokenPriceAfterInvestmentsOnly.png";
  set title "1 mToken sell price over investments into mToken";
  set xlabel "Total invested in mtoken (MEM)";
  set ylabel "MEM";
  plot "/tmp/stats.csv" using 1:3 with lines title "1 mToken sell price";
'
