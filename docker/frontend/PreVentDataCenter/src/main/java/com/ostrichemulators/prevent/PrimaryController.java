package com.ostrichemulators.prevent;

import com.ostrichemulators.prevent.WorkItem.Status;
import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.ResourceBundle;
import java.util.Set;
import java.util.stream.Collectors;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.fxml.Initializable;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.ButtonType;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Label;
import javafx.scene.control.OverrunStyle;
import javafx.scene.control.RadioButton;
import javafx.scene.control.Spinner;
import javafx.scene.control.SpinnerValueFactory;
import javafx.scene.control.SpinnerValueFactory.ListSpinnerValueFactory;
import javafx.scene.control.SplitPane;
import javafx.scene.control.TableCell;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableRow;
import javafx.scene.control.TableView;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Window;
import javafx.util.StringConverter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.nio.file.Files;
import java.util.Collection;
import javafx.application.Platform;
import javafx.beans.property.ReadOnlyObjectWrapper;
import javafx.beans.value.ObservableValue;
import javafx.scene.control.TableColumn.CellDataFeatures;
import javafx.util.Callback;

public class PrimaryController implements Initializable, WorkItemStateChangeListener {

  private static final Logger LOG = LoggerFactory.getLogger( PrimaryController.class );
  private static final int COLWIDTHS[] = {15, 50, 10, 10, 15, 15, 10, 10, 10};
  @FXML
  private TableView<Conversion> table;

  @FXML
  private TableColumn<Conversion, Status> statuscol;

  @FXML
  private TableColumn<Conversion, Path> filecol;

  @FXML
  private TableColumn<Conversion, Path> outputcol;

  @FXML
  private TableColumn<Conversion, LocalDateTime> startedcol;

  @FXML
  private TableColumn<Conversion, LocalDateTime> endedcol;

  @FXML
  private TableColumn<Conversion, String> messagecol;

  @FXML
  private TableColumn<Conversion, Long> sizecol;

  @FXML
  private TableColumn<Conversion, String> typecol;

  @FXML
  private TableColumn<Conversion, String> containercol;

  @FXML
  private CheckBox nativestp;

  @FXML
  private CheckBox usephilips;

  @FXML
  private CheckBox removecontainers;

  @FXML
  private Spinner<Integer> dockercnt;

  @FXML
  private Spinner<Integer> durationtimer;

  @FXML
  private Label outputlbl;

  @FXML
  private Label loglbl;

  @FXML
  private SplitPane splitter;

  @FXML
  private RadioButton dockerconverter;

  @FXML
  private RadioButton nativeconverter;

  private Path savelocation;
  private WorkItemEntryController detailscontroller;

  @FXML
  void saveconfig() {
    App.converter.setMaxRunners( dockercnt.getValue() );
    dockercnt.setValueFactory( new SpinnerValueFactory.IntegerSpinnerValueFactory( 1,
          10, dockercnt.getValue() ) );

    App.prefs
          .setMaxConversionMinutes( durationtimer.getValue() )
          .setNativeStp( nativestp.isSelected() )
          .setMaxDockerCount( dockercnt.getValue() )
          .setStpPhilips( usephilips.isSelected() )
          .setRemoveDockerOnSuccess( removecontainers.isSelected() )
          .setLogPath( Paths.get( loglbl.getText() ) );
    if ( !"From Input".equals( outputlbl.getText() ) ) {
      App.prefs.setOutputPath( Paths.get( outputlbl.getText() ) );
    }
  }

  private void loadPrefs() {
    nativestp.setSelected( App.prefs.useNativeStp() );
    usephilips.setSelected( App.prefs.isStpPhilips() );

    if ( App.prefs.useNativeConverter() ) {
      nativeconverter.setSelected( true );
    }

    removecontainers.setSelected( App.prefs.removeDockerOnSuccess() );
    App.converter.setMaxRunners( App.prefs.getMaxDockerCount() );
    dockercnt.setValueFactory( new SpinnerValueFactory.IntegerSpinnerValueFactory( 1,
          10, App.converter.getMaxRunners() ) );

    outputlbl.setTextOverrun( OverrunStyle.CENTER_ELLIPSIS );
    Path outpath = App.prefs.getOutputPath();
    outputlbl.setText( null == outpath ? "From Input" : outpath.toString() );

    if ( null != outpath && !Files.exists( outpath ) ) {
      LOG.info( "creating output directory: {}", outpath );

      boolean created = outpath.toFile().mkdirs();
      if ( !created ) {
        Alert alert = new Alert( Alert.AlertType.ERROR );
        alert.setTitle( "Docker Images Missing" );
        alert.setHeaderText( "Docker is not Initialized Properly" );
        ButtonType exitbtn = new ButtonType( "Cancel", ButtonBar.ButtonData.CANCEL_CLOSE );
        alert.getButtonTypes().setAll( exitbtn );
        alert.setContentText( "Docker may not be started, or the ry99/prevent image could not be pulled.\nOn Windows, Docker must be listening to port 2375.\nContinuing with Native Converter" );

      }
    }

    loglbl.setTextOverrun( OverrunStyle.CENTER_ELLIPSIS );
    Path logdirpath = App.prefs.getLogPath();
    loglbl.setText( logdirpath.toString() );

    ListSpinnerValueFactory<Integer> vfac = new SpinnerValueFactory.ListSpinnerValueFactory<>(
          FXCollections.observableArrayList( 10, 30, 60, 180, 480, Integer.MAX_VALUE ) );
    vfac.setConverter( new StringConverter<Integer>() {
      @Override
      public String toString( Integer t ) {
        if ( t <= 60 ) {
          return String.format( "%d minutes", t );
        }
        if ( t < Integer.MAX_VALUE ) {
          return String.format( "%d hours", t / 60 );
        }
        return "Unlimited";
      }

      @Override
      public Integer fromString( String string ) {
        for ( Integer i : vfac.getItems() ) {
          if ( toString( i ).equals( string ) ) {
            return i;
          }
        }
        return Integer.MAX_VALUE;
      }
    } );
    vfac.setValue( Integer.MAX_VALUE );
    durationtimer.setValueFactory( vfac );
  }

  @Override
  public void initialize( URL url, ResourceBundle rb ) {
    savelocation = App.getConfigLocation();

    FXMLLoader loader = new FXMLLoader( App.class.getResource( "workitementry.fxml" ) );
    try {
      Parent parent = loader.load();
      detailscontroller = loader.getController();
      splitter.getItems().add( parent );
      splitter.setDividerPosition( 0, 1.0 );
    }
    catch ( IOException x ) {
      LOG.error( "{}", x );
    }

    removecontainers.disableProperty().bind( nativeconverter.selectedProperty() );

    fixTableLayout();

    loadPrefs();

    Path outpath = App.prefs.getOutputPath();
    if ( null != outpath && !Files.exists( outpath ) ) {
      LOG.info( "creating output directory: {}", outpath );

      boolean created = outpath.toFile().mkdirs();
      if ( !created ) {
        Alert alert = new Alert( Alert.AlertType.ERROR );
        alert.setTitle( "Cannot create output directory" );
        alert.setHeaderText( "Output path: " + outpath.toString() + " does not exist and could not be created" );
        ButtonType exitbtn = new ButtonType( "Okay", ButtonBar.ButtonData.CANCEL_CLOSE );
        alert.getButtonTypes().setAll( exitbtn );
        alert.setContentText( outpath + " does not exist and could not be created\nOutput files will not be generated\nPlease set the \"Output Path\" preference before converting files" );
        alert.showAndWait();
      }
    }

    boolean natives = nativeconverter.isSelected();

    if ( App.converter.useNativeConverters( natives ) ) {
      LOG.debug( "Converter is ready!" );
    }
    else if ( !natives ) {
      dockerconverter.setDisable( true );
      nativeconverter.setSelected( true );

      Alert alert = new Alert( Alert.AlertType.ERROR );
      alert.setTitle( "Docker Images Missing" );
      alert.setHeaderText( "Docker is not Initialized Properly" );
      ButtonType exitbtn = new ButtonType( "Cancel", ButtonBar.ButtonData.CANCEL_CLOSE );
      alert.getButtonTypes().setAll( exitbtn );
      alert.setContentText( "Docker may not be started, or the ry99/prevent image could not be pulled.\nOn Windows, Docker must be listening to port 2375.\nContinuing with Native Converter" );
      alert.showAndWait();

      if ( !App.converter.useNativeConverters( natives ) ) {
        alert = new Alert( Alert.AlertType.ERROR );
        alert.setTitle( "No Converters initialized" );
        alert.setHeaderText( "The fallback (Native) Converter did not initialize properly." );
        alert.getButtonTypes().setAll( exitbtn );
        alert.setContentText( "Are you on a supported platform? Windows and Linux are supported at this time." );
        alert.showAndWait();
        Platform.exit();
      }
    }

    try {
      List<WorkItem> loadeditems = Worklist.open( savelocation );

      table.setRowFactory( tv -> {
        TableRow<Conversion> row = new TableRow();
        row.setOnMouseClicked( event -> {
          Conversion item = row.getItem();
          if ( !row.isEmpty() ) {
            detailscontroller.setItem( item );
            if ( event.getClickCount() > 1 ) {
              toggleDetails( item );
            }
          }
        } );
        return row;
      } );

      Collection<Conversion> allitems = App.converter.reinitializeItems( loadeditems, this );

      table.getItems().addAll( allitems );
    }
    catch ( IOException x ) {
      LOG.error( "{}", x );
    }
  }

  private void toggleDetails( Conversion item ) {
    double pos = splitter.getDividerPositions()[0];
    if ( pos > 0.7 ) {
      splitter.setDividerPosition( 0, 0.4 );
    }
    else {
      splitter.setDividerPosition( 0, 1.0 );
    }
  }

  private void fixTableLayout() {
    TableColumn cols[] = {statuscol, filecol, sizecol, typecol, startedcol,
      endedcol, messagecol, containercol, outputcol};

    double sum = 0d;
    for ( int i = 0; i < COLWIDTHS.length; i++ ) {
      sum += ( cols[i].isVisible() ? COLWIDTHS[i] : 0 );
    }

    for ( int i = 0; i < COLWIDTHS.length; i++ ) {
      if ( cols[i].isVisible() ) {
        double pct = COLWIDTHS[i] / sum;
        cols[i].prefWidthProperty().bind(
              table.widthProperty().multiply( pct ) );
      }
    }

    statuscol.setCellValueFactory( new ConversionPropertyCellFactory<>( "status" ) );
    messagecol.setCellValueFactory( new ConversionPropertyCellFactory<>( "message" ) );
    typecol.setCellValueFactory( new ConversionPropertyCellFactory<>( "type" ) );
    containercol.setCellValueFactory( new ConversionPropertyCellFactory<>( "containerId" ) );

    sizecol.setCellValueFactory( new ConversionPropertyCellFactory<>( "bytes" ) );
    sizecol.setCellFactory( column -> new KbTableCell() );

    filecol.setCellValueFactory( new ConversionPropertyCellFactory<>( "path" ) );
    filecol.setCellFactory( column -> new LeadingEllipsisTableCell() );

    outputcol.setCellValueFactory( new ConversionPropertyCellFactory<>( "outputPath" ) );
    outputcol.setCellFactory( column -> new LeadingEllipsisTableCell() );

    startedcol.setCellValueFactory( new ConversionPropertyCellFactory<>( "started" ) );
    startedcol.setCellFactory( column -> new LocalDateTableCell() );

    endedcol.setCellValueFactory( new ConversionPropertyCellFactory<>( "finished" ) );
    endedcol.setCellFactory( column -> new LocalDateTableCell() );
  }

  @FXML
  void switchToSecondary() throws IOException {
    App.setRoot( "secondary" );
  }

  @FXML
  void convertAll() throws IOException {
    try {
      // ignore items that are already running, already finished, or already queued
      Set<Status> workable = new HashSet<>( List.of( Status.ERROR, Status.ADDED, Status.KILLED ) );
      List<Conversion> todo = table.getItems().stream()
            .filter( wi -> workable.contains( wi.getItem().getStatus() ) )
            .collect( Collectors.toList() );
      App.converter.convert( todo );
    }
    catch ( IOException x ) {
      LOG.error( "{}", x );
    }
  }

  @FXML
  void convertSelected() throws IOException {
    try {
      // run whatever's selected (except already-queued or already running items)
      Set<Status> workable = new HashSet<>( List.of( Status.RUNNING, Status.PREPROCESSING, Status.QUEUED ) );
      List<Conversion> todo = table.getSelectionModel().getSelectedItems().stream()
            .filter( wi -> !workable.contains( wi.getItem().getStatus() ) )
            .collect( Collectors.toList() );
      App.converter.convert( todo );
    }
    catch ( IOException x ) {
      LOG.error( "{}", x );
    }
  }

  private void saveWorklist() throws IOException {
    Worklist.save( table.getItems().stream().map( conv -> conv.getItem() ).collect( Collectors.toList() ), savelocation );
  }

  @FXML
  void addFiles() throws IOException {
    FileChooser chsr = new FileChooser();
    chsr.setTitle( "Create New Worklist Items" );
    chsr.setInitialDirectory( App.prefs.getLastOpenedDir() );
    Window window = table.getScene().getWindow();
    final boolean nativestpx = App.prefs.useNativeStp();

    List<WorkItem> newitems = chsr.showOpenMultipleDialog( window ).stream()
          .map( file -> Worklist.from( file.toPath(), nativestpx ) )
          .filter( wi -> wi.isPresent() )
          .map( wi -> wi.get() )
          .collect( Collectors.toList() );
    if ( !newitems.isEmpty() ) {
      table.getItems().addAll( App.converter.reinitializeItems( newitems, this ) );
      saveWorklist();
      App.prefs.setLastOpenedDir( newitems.get( 0 ).getPath().getParent().toFile() );
    }
  }

  @FXML
  void addDir() throws IOException {
    DirectoryChooser chsr = new DirectoryChooser();
    chsr.setTitle( "Create New Worklist Items from Directory" );
    chsr.setInitialDirectory( App.prefs.getLastOpenedDir() );
    Window window = table.getScene().getWindow();
    final boolean nativestpx = App.prefs.useNativeStp();

    File dir = chsr.showDialog( window );
    if ( null != dir ) {
      List<WorkItem> items = Worklist.recursively( dir.toPath(), nativestpx );
      table.getItems().addAll( App.converter.reinitializeItems( items, this ) );
      saveWorklist();
      App.prefs.setLastOpenedDir( dir.getParentFile() );
    }
  }

  @Override
  public void itemChanged( WorkItem item ) {
    table.refresh();
    try {
      saveWorklist();
    }
    catch ( IOException xx ) {
      LOG.warn( "Could not save WorkItem update", xx );
    }
  }

  @FXML
  void selectOutputDir() {
    DirectoryChooser chsr = new DirectoryChooser();
    chsr.setTitle( "Select Output Directory" );

    Path outdir = App.prefs.getOutputPath();
    if ( null != outdir && Files.exists( outdir ) ) {
      chsr.setInitialDirectory( outdir.toFile() );
    }
    Window window = table.getScene().getWindow();

    File dir = chsr.showDialog( window );
    outputlbl.setText( dir.getAbsolutePath() );
  }

  @FXML
  void setOutputFromInput() {
    outputlbl.setText( "From Input" );
  }

  @FXML
  void selectLogDir() {
    DirectoryChooser chsr = new DirectoryChooser();
    chsr.setTitle( "Select Log Directory" );

    Path outdir = App.prefs.getLogPath();
    chsr.setInitialDirectory( outdir.toFile() );
    Window window = table.getScene().getWindow();

    File dir = chsr.showDialog( window );
    loglbl.setText( dir.getAbsolutePath() );
  }

  private static class LocalDateTableCell extends TableCell<Conversion, LocalDateTime> {

    @Override
    protected void updateItem( LocalDateTime item, boolean empty ) {
      super.updateItem( item, empty );
      if ( empty || null == item ) {
        setText( null );
      }
      else {
        setText( item.format( DateTimeFormatter.ofPattern( "MM/dd/yyyy hh:mm:ss.SSS" ) ) );
      }
    }
  }

  private static class LeadingEllipsisTableCell extends TableCell<Conversion, Path> {

    @Override
    protected void updateItem( Path item, boolean empty ) {
      super.updateItem( item, empty );

      setTextOverrun( OverrunStyle.LEADING_ELLIPSIS );
      if ( empty || null == item ) {
        setText( null );
      }
      else {
        setText( item.toString() );
      }
    }
  }

  private static class KbTableCell extends TableCell<Conversion, Long> {

    @Override
    protected void updateItem( Long bytes, boolean empty ) {
      super.updateItem( bytes, empty );

      setAlignment( Pos.CENTER_RIGHT );
      if ( empty ) {
        setText( null );
      }
      else {
        setText( String.valueOf( bytes / 1000 ) );
      }
    }
  }

  private static class ConversionPropertyCellFactory<T> implements Callback<CellDataFeatures<Conversion, T>, ObservableValue<T>> {

    private final String prop;

    ConversionPropertyCellFactory( String propname ) {
      prop = propname;
    }

    @Override
    public ObservableValue<T> call( CellDataFeatures<Conversion, T> p ) {
      WorkItem item = p.getValue().getItem();
      switch ( prop ) {
        case "status":
          return (ObservableValue<T>) ( item.statusProperty() );
        case "message":
          return (ObservableValue<T>) ( item.messageProperty() );
        case "containerId":
          return (ObservableValue<T>) ( item.containerIdProperty() );
        case "bytes":
          return (ObservableValue<T>) ( item.bytesProperty() );
        case "path":
          T val = (T) item.getPath();
          return new ReadOnlyObjectWrapper<T>( val );
        case "outputPath":
          return (ObservableValue<T>) ( item.messageProperty() );
        case "started":
          return (ObservableValue<T>) ( item.startedProperty() );
        case "finished":
          return (ObservableValue<T>) ( item.finishedProperty() );
        case "type":
          return (ObservableValue<T>) ( item.typeProperty() );
        default:
          throw new RuntimeException( "Cell factory not yet implemented for property: " + prop );
      }
    }
  }
}
