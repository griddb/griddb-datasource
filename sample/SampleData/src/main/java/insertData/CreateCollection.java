package insertData;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Random;

import com.toshiba.mwcloud.gs.ContainerInfo;
import com.toshiba.mwcloud.gs.GridStore;
import com.toshiba.mwcloud.gs.GridStoreFactory;
import com.toshiba.mwcloud.gs.Row;
class Sampling1 {
	Date time_1;
	Date time_2;
	String column1;
	int column2;
}

public class CreateCollection {
	public void createCollection() {
		final int BUFFER_SIZE = 1000;
		final int RANDOM_NUM = 100;
		final int DECREASE_UNIT = 1000;
		final InputStream inputStream = CreateCollection.class.getClassLoader().getResourceAsStream("griddb.properties");
		try {
			Properties props = new Properties();
			props.load(inputStream);
			GridStore griddb = GridStoreFactory.getInstance().getGridStore(props);

			String containerName = "Multiple_Time_Columns";
			Integer containerSize = 10;

			long base = new Date().getTime();
			Random rand = new Random();

			if (griddb.getCollection(containerName) == null) {
				griddb.putCollection(containerName, Sampling1.class);
			} else {
				griddb.dropCollection(containerName);
				griddb.putCollection(containerName, Sampling1.class);
			}

			ContainerInfo ci = griddb.getContainerInfo(containerName);
			List<Row> rows = new ArrayList<>();
			Map<String, List<Row>> rowsMap = new HashMap<>();
			for (int i = 0; i < containerSize; i++) {
				Row row = griddb.createRow(ci);
				long time = base - (i * DECREASE_UNIT);
				row.setTimestamp(0, new Date(time));
				row.setTimestamp(1, new Date(time));
				row.setString(2, "test-" + (rand.nextInt(100) + 400));
				row.setInteger(3, rand.nextInt(RANDOM_NUM) - 50);
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
}