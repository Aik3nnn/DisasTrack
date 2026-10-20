import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/app_state.dart';
import 'report_incident_screen.dart';

class ResidentHomeScreen extends StatelessWidget {
  const ResidentHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final profile = context.watch<AppState>().residentProfile ?? {};
    final name = profile['name'] ?? 'Resident';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Resident Dashboard'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Welcome, $name',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),

            Card(
              child: ListTile(
                leading: const Icon(Icons.warning_amber_rounded, color: Colors.red),
                title: const Text('Report an emergency'),
                subtitle: const Text('Send a new incident report with details and location'),
                trailing: const Icon(Icons.arrow_forward_ios),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ReportIncidentScreen()),
                  );
                },
              ),
            ),

            const SizedBox(height: 16),

            Card(
              child: ListTile(
                leading: const Icon(Icons.history),
                title: const Text('My reports'),
                subtitle: const Text('Past reports and current status'),
                trailing: const Icon(Icons.arrow_forward_ios),
                onTap: () {
                  // Later: navigate to reports history
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}