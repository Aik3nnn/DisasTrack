class Incident {
  final String id;
  final String residentId;
  final String title;
  final String description;
  final String category;
  final String status;
  final double? latitude;
  final double? longitude;
  final String createdAt;

  Incident({
    required this.id,
    required this.residentId,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.latitude,
    required this.longitude,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'residentId': residentId,
        'title': title,
        'description': description,
        'category': category,
        'status': status,
        'latitude': latitude,
        'longitude': longitude,
        'createdAt': createdAt,
      };

  factory Incident.fromMap(String id, Map<String, dynamic> map) {
    return Incident(
      id: id,
      residentId: map['residentId'] ?? '',
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      category: map['category'] ?? 'General',
      status: map['status'] ?? 'Submitted',
      latitude: map['latitude'] != null ? (map['latitude'] as num).toDouble() : null,
      longitude: map['longitude'] != null ? (map['longitude'] as num).toDouble() : null,
      createdAt: map['createdAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}