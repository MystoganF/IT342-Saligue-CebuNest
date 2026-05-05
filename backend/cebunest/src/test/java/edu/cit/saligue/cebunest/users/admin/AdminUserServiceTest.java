package edu.cit.saligue.cebunest.users.admin;

import edu.cit.saligue.cebunest.users.shared.RoleRepository;
import edu.cit.saligue.cebunest.users.shared.User;
import edu.cit.saligue.cebunest.users.shared.UserDTO;
import edu.cit.saligue.cebunest.users.shared.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private AdminUserService adminUserService;

    @Test
    void adminSetActive_DeactivatesUserSuccessfully() {
        // Arrange
        User targetUser = User.builder()
                .id(5L)
                .email("badactor@test.com")
                .active(true) // Currently active
                .build();

        when(userRepository.findById(5L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act
        // Admin decides to deactivate this user
        UserDTO result = adminUserService.adminSetActive(5L, false);

        // Assert
        assertFalse(result.isActive(), "The returned DTO should reflect the deactivated status");
        assertFalse(targetUser.isActive(), "The actual entity should be modified before saving");
        verify(userRepository).save(targetUser); // Verify save was called
    }
}