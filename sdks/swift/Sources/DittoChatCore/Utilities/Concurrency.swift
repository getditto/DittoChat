//
//  Concurrency.swift
//  DittoChat
//
//  Created by Bryan Malumphy on 9/4/25.
//

import Combine

// Wraps a non-Sendable value so it can cross task boundaries.
// Safe only when the wrapped value is accessed from a single task at a time.
private final class SendableBox<T>: @unchecked Sendable {
    let value: T
    init(_ value: T) { self.value = value }
}

extension Publisher where Output: Sendable {

    func asyncMap<T: Sendable>(
        _ transform: @Sendable @escaping (Output) async throws -> T
    ) -> Publishers.FlatMap<Future<T, Error>, Self> {
        flatMap { value in
            Future { promise in
                let vBox = SendableBox(value)
                let pBox = SendableBox(promise)
                Task {
                    do {
                        let output = try await transform(vBox.value)
                        pBox.value(.success(output))
                    } catch {
                        pBox.value(.failure(error))
                    }
                }
            }
        }
    }

    func asyncMap<T: Sendable>(
        _ transform: @Sendable @escaping (Output) async -> T
    ) -> Publishers.FlatMap<Future<T, Never>, Self> {
        flatMap { value in
            Future { promise in
                let vBox = SendableBox(value)
                let pBox = SendableBox(promise)
                Task {
                    let output = await transform(vBox.value)
                    pBox.value(.success(output))
                }
            }
        }
    }
}
