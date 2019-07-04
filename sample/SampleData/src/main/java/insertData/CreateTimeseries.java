package insertData;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Random;
import java.util.stream.Collectors;
import com.toshiba.mwcloud.gs.ContainerInfo;
import com.toshiba.mwcloud.gs.GridStore;
import com.toshiba.mwcloud.gs.GridStoreFactory;
import com.toshiba.mwcloud.gs.Row;
import com.toshiba.mwcloud.gs.RowKey;

class Sampling {
	@RowKey
	Date time;
	int column1;
	int column2;
	int column3;
	int column4;
	int column5;
}

class Sampling2 {
	@RowKey
	Date time;
	int column1;
	String column2;
	Boolean column3;
	Double column4;
	Float column5;

}

public class CreateTimeseries {
	final int BUFFER_SIZE = 1000;
	final int RANDOM_NUM = 1000;
	final int DECREASE_UNIT = 1000;
	public static final String SOURCES = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";

	public void createTimeseries() {

		try {
			InputStream inputStream = CreateCollection.class.getClassLoader().getResourceAsStream("griddb.properties");
			Properties props = new Properties();

			props.load(inputStream);
			GridStore griddb = GridStoreFactory.getInstance().getGridStore(props);

			String containerName = "one_thousand_rows";
			Integer containerSize = 1000;

			long base = new Date().getTime();
			Random rand = new Random();

			if (griddb.getTimeSeries(containerName) == null) {
				griddb.putTimeSeries(containerName, Sampling.class);
			} else {
				griddb.dropTimeSeries(containerName);
				griddb.putTimeSeries(containerName, Sampling.class);
			}

			ContainerInfo ci = griddb.getContainerInfo(containerName);

			List<Row> rows = new ArrayList<>();
			Map<String, List<Row>> rowsMap = new HashMap<>();

			for (int i = 0; i < containerSize; i++) {
				long time = base - (i * DECREASE_UNIT);
				Row row = griddb.createRow(ci);
				row.setTimestamp(0, new Date(time));
				row.setInteger(1, rand.nextInt(RANDOM_NUM));
				row.setInteger(2, rand.nextInt(RANDOM_NUM));
				row.setInteger(3, rand.nextInt(RANDOM_NUM));
				row.setInteger(4, rand.nextInt(RANDOM_NUM));
				row.setInteger(5, rand.nextInt(RANDOM_NUM));
				rows.add(row);
				if (rows.size() >= BUFFER_SIZE) {
					rowsMap.put(containerName, rows);
					griddb.multiPut(rowsMap);
					rowsMap.clear();
					rows.clear();
				}
			}

			rowsMap.put(containerName, rows);
			griddb.multiPut(rowsMap);

			griddb.close();
			rowsMap.clear();
			rows.clear();

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void createTimeseriesMultiType() {
		try {
			Properties props = new Properties();
			InputStream inputStream = CreateCollection.class.getClassLoader().getResourceAsStream("griddb.properties");
			props.load(inputStream);
			GridStore griddb = GridStoreFactory.getInstance().getGridStore(props);

			String containerName = "Multiple_Type";
			Integer containerSize = 500;

			long base = new Date().getTime();
			Random rand = new Random();

			if (griddb.getTimeSeries(containerName) == null) {
				griddb.putTimeSeries(containerName, Sampling2.class);
			} else {
				griddb.dropTimeSeries(containerName);
				griddb.putTimeSeries(containerName, Sampling2.class);
			}

			ContainerInfo ci = griddb.getContainerInfo(containerName);

			List<Row> rows = new ArrayList<>();
			Map<String, List<Row>> rowsMap = new HashMap<>();
			int length = 8;
			String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";

			for (int i = 0; i < containerSize; i++) {
				String str = new Random().ints(length, 0, chars.length()).mapToObj(j -> "" + chars.charAt(j))
						.collect(Collectors.joining());
				long time = base - (i * DECREASE_UNIT);
				Row row = griddb.createRow(ci);
				row.setTimestamp(0, new Date(time));
				row.setInteger(1, rand.nextInt(RANDOM_NUM));
				row.setString(2, str);
				row.setBool(3, rand.nextBoolean());
				row.setDouble(4, rand.nextDouble());
				row.setFloat(5, rand.nextFloat());
				rows.add(row);
				if (rows.size() >= BUFFER_SIZE) {
					rowsMap.put(containerName, rows);
					griddb.multiPut(rowsMap);
					rowsMap.clear();
					rows.clear();
				}
			}

			rowsMap.put(containerName, rows);
			griddb.multiPut(rowsMap);

			griddb.close();
			rowsMap.clear();
			rows.clear();

		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public String generateString(Random random, String characters, int length) {
		char[] text = new char[length];
		for (int i = 0; i < length; i++) {
			text[i] = characters.charAt(random.nextInt(characters.length()));
		}
		return new String(text);
	}
}