import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  useWindowDimensions,
  Platform,
  Image,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Get screen dimensions for responsive sizing
const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

const EndScreen = ({ score, timeTaken, resetGame }) => {
  const router = useRouter();
  const pathname = usePathname(); // Get the current route
  const { width, height } = useWindowDimensions(); // Use dynamic dimensions

  // Check if we're in landscape mode with limited height
  const isLandscapeWithLimitedHeight = width > height && height < 500;

  // Get current level from the pathname
  const pathSegments = pathname.split("/"); // Split the path into parts
  const currentLevel = pathSegments[pathSegments.length - 1]; // Get last segment (e.g., 'level1')
  const levelsPath = pathSegments.slice(0, -1).join("/"); // Path to the levels directory
  const chaptersPath = pathSegments.slice(0, -1).join("/"); // Path to the chapters

  // Get next level dynamically
  const levelNumber = parseInt(currentLevel.replace("level", ""), 10);
  const nextLevel = isNaN(levelNumber)
    ? null
    : `${levelsPath}/level${levelNumber + 1}`;

  // Handle next level navigation
  const handleNextLevel = () => {
    // Check if next level exists (highest level is 5)
    if (levelNumber >= 5) {
      Alert.alert(
        "Congratulations!",
        "You've completed all levels in this chapter!",
        [{ text: "OK", onPress: () => router.push(chaptersPath) }]
      );
    } else {
      router.push(nextLevel);
    }
  };

  // Calculate stars based on score
  const renderStars = () => {
    const starCount = Math.min(Math.max(Math.floor(score / 20), 1), 5);
    return Array(starCount)
      .fill(0)
      .map((_, i) => (
        <Ionicons
          key={i}
          name="star"
          size={isLandscapeWithLimitedHeight ? width * 0.025 : width * 0.03}
          color="#FFD700"
          style={{ marginHorizontal: 2 }}
        />
      ));
  };

  // Remove passing score restriction - all attempts are considered as completed
  const isPassingScore = true; // Changed from score >= 40

  return (
    <View style={[styles.container, { backgroundColor: "#4a6da7" }]}>
      <View style={styles.contentBox}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.title,
              isLandscapeWithLimitedHeight && styles.landscapeTitle,
            ]}
          >
            {score >= 40 ? "🎉 Level Complete!" : "Level Completed"}
          </Text>
        </View>

        {/* Content Section - Flex direction changes based on orientation */}
        <View
          style={[
            styles.contentSection,
            isLandscapeWithLimitedHeight && styles.landscapeContentSection,
          ]}
        >
          {/* Score and Time Section */}
          <View
            style={[
              styles.statsSection,
              isLandscapeWithLimitedHeight && styles.landscapeStatsSection,
            ]}
          >
            <View
              style={[
                styles.scoreContainer,
                isLandscapeWithLimitedHeight && styles.landscapeScoreContainer,
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  isLandscapeWithLimitedHeight && styles.landscapeText,
                ]}
              >
                Score: {score}
              </Text>
              <View style={styles.starsContainer}>{renderStars()}</View>
            </View>

            <View
              style={[
                styles.timeContainer,
                isLandscapeWithLimitedHeight && styles.landscapeTimeContainer,
              ]}
            >
              <Text
                style={[
                  styles.timeText,
                  isLandscapeWithLimitedHeight && styles.landscapeText,
                ]}
              >
                Time: {timeTaken} seconds
              </Text>
            </View>
          </View>

          {/* Buttons Section */}
          <View
            style={[
              styles.buttonContainer,
              isLandscapeWithLimitedHeight && styles.landscapeButtonContainer,
            ]}
          >
            {/* Next Level Button - show for all completions */}
            {nextLevel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.nextButton,
                  isLandscapeWithLimitedHeight && styles.landscapeButton,
                ]}
                onPress={handleNextLevel}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isLandscapeWithLimitedHeight && styles.landscapeButtonText,
                  ]}
                >
                  Next Level
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="white"
                  style={{ marginLeft: 5 }}
                />
              </TouchableOpacity>
            )}

            {/* Play Again Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.replayButton,
                isLandscapeWithLimitedHeight && styles.landscapeButton,
              ]}
              onPress={resetGame}
            >
              <Text
                style={[
                  styles.buttonText,
                  isLandscapeWithLimitedHeight && styles.landscapeButtonText,
                ]}
              >
                Play Again
              </Text>
              <Ionicons
                name="refresh"
                size={16}
                color="white"
                style={{ marginLeft: 5 }}
              />
            </TouchableOpacity>

            {/* Go to Chapter Screen */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.menuButton,
                isLandscapeWithLimitedHeight && styles.landscapeButton,
              ]}
              onPress={() => router.push(chaptersPath)}
            >
              <Text
                style={[
                  styles.buttonText,
                  isLandscapeWithLimitedHeight && styles.landscapeButtonText,
                ]}
              >
                Level Menu
              </Text>
              <Ionicons
                name="grid"
                size={16}
                color="white"
                style={{ marginLeft: 5 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  contentBox: {
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  portraitContentBox: {
    width: "55%",
    maxWidth: 500,
  },
  landscapeContentBox: {
    width: "80%",
    maxWidth: 800,
    flexDirection: "column",
    padding: 15,
  },
  titleSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    fontFamily: "Montserrat_Bold",
  },
  landscapeTitle: {
    fontSize: 26,
    marginBottom: 5,
  },
  contentSection: {
    width: "100%",
    alignItems: "center",
  },
  landscapeContentSection: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsSection: {
    width: "100%",
    alignItems: "center",
  },
  landscapeStatsSection: {
    width: "50%",
    paddingRight: 10,
  },
  scoreContainer: {
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    borderRadius: 10,
    padding: 15,
    width: "90%",
    alignItems: "center",
    marginBottom: 15,
  },
  landscapeScoreContainer: {
    padding: 10,
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2c3e50",
    fontFamily: "Montserrat_Bold",
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 5,
  },
  timeContainer: {
    backgroundColor: "rgba(46, 204, 113, 0.1)",
    borderRadius: 10,
    padding: 15,
    width: "90%",
    alignItems: "center",
    marginBottom: 15,
  },
  landscapeTimeContainer: {
    padding: 10,
    marginBottom: 10,
  },
  timeText: {
    fontSize: 18,
    color: "#2c3e50",
    fontFamily: "Montserrat_Regular",
  },
  landscapeText: {
    fontSize: 18,
    marginBottom: 5,
  },
  buttonContainer: {
    width: "90%",
    alignItems: "center",
  },
  landscapeButtonContainer: {
    width: "45%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    marginVertical: 8,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "center",
  },
  landscapeButton: {
    paddingVertical: 8,
    marginVertical: 5,
  },
  nextButton: {
    backgroundColor: "#2ecc71", // Green for next level
  },
  replayButton: {
    backgroundColor: "#3498db", // Blue for replay
  },
  menuButton: {
    backgroundColor: "#9b59b6", // Purple for menu
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Montserrat_Bold",
  },
  landscapeButtonText: {
    fontSize: 18,
  },
});

export default EndScreen;
