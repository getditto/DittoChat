pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "DittoChatAndroidDemo"
include(":app")

// Pull the DittoChat SDK directly from the local repository so changes to sdks/kotlin
// are reflected in the demo app immediately without publishing to Maven Central.
include(":dittochat")
project(":dittochat").projectDir = File("../../sdks/kotlin")
