package insertData;

public class MainApp {

	public static void main(String[] args) {
		CreateTimeseries createTimeseries = new CreateTimeseries();
		CreateCollection createCollection = new CreateCollection();
		createCollection.createCollection();
		createTimeseries.createTimeseries();
		createTimeseries.createTimeseriesMultiType();
		System.out.println("Insert data successfully!");
	}

}
