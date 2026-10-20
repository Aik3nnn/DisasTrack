import 'package:flutter/material.dart';

class AppState extends ChangeNotifier {
  String? uid;
  String? role;
  Map<String, dynamic>? residentProfile;

  void setUser({
    required String userId,
    required String roleName,
    required Map<String, dynamic> profile,
  }) {
    uid = userId;
    role = roleName;
    residentProfile = profile;
    notifyListeners();
  }

  void clearUser() {
    uid = null;
    role = null;
    residentProfile = null;
    notifyListeners();
  }
}