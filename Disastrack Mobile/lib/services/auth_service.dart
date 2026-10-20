import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseDatabase _db = FirebaseDatabase.instance;

  String usernameToEmail(String username) {
    return "${username.trim().toLowerCase()}@disastrack.app";
  }

  Future<UserCredential> signInResident({
    required String username,
    required String password,
  }) async {
    final email = usernameToEmail(username);
    return _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<Map<String, dynamic>?> loadResidentProfile(String uid) async {
    final snapshot = await _db.ref('userRoles/$uid').get();
    final role = snapshot.value;

    if (role == null || role.toString() != 'Resident') {
      throw Exception('This account is not a resident.');
    }

    final profileSnapshot = await _db.ref('users/Residents/$uid').get();
    if (!profileSnapshot.exists) {
      throw Exception('Resident profile not found.');
    }

    return Map<String, dynamic>.from(profileSnapshot.value as Map);
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}