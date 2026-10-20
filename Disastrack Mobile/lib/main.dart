import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'services/app_state.dart';
import 'screens/resident/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: "AIzaSyDzodK8IT9kEXUHvXfbhlCkAxYONJaq7zI",
      authDomain: "disastrackdb.firebaseapp.com",
      databaseURL: "https://disastrackdb-default-rtdb.firebaseio.com",
      projectId: "disastrackdb",
      storageBucket: "disastrackdb.firebasestorage.app",
      messagingSenderId: "564192944628",
      appId: "1:564192944628:web:9f365d8b6fa9b8060419a1",
    ),
  );

  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DisasTrack Resident',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.red,
      ),
      home: const ResidentLoginScreen(),
    );
  }
}